import { sql } from '@vercel/postgres';

/**
 * 1. 通过取件码查客户信息（JOIN pickup_codes + customers）
 * 返回客户+设备关联信息，或 null
 */
export async function getCustomerByPickupCode(pickupCode) {
  const { rows } = await sql`
    SELECT
      c.customer_id,
      c.customer_name,
      c.contact,
      c.plan,
      c.start_date,
      c.end_date,
      c.status,
      c.max_devices,
      p.pickup_code,
      p.device_id,
      p.is_active,
      p.config_snapshot,
      p.account_name
    FROM pickup_codes p
    JOIN customers c ON p.customer_id = c.customer_id
    WHERE p.pickup_code = ${pickupCode};
  `;

  return rows.length > 0 ? rows[0] : null;
}

/**
 * 2. 更新设备信息（心跳写入）
 * 用 UPDATE 语句更新 pickup_codes 表对应行，同时更新 last_heartbeat = NOW()
 */
export async function upsertDevice(pickupCode, deviceData) {
  const {
    deviceId,
    deviceModel,
    appVersion,
    osVersion,
    lastPublishTime,
    deviceStatus,
    configSnapshot,
    monitorData
  } = deviceData;

  const { rowCount } = await sql`
    UPDATE pickup_codes
    SET
      device_id = ${deviceId || null},
      device_model = ${deviceModel || null},
      app_version = ${appVersion || null},
      os_version = ${osVersion || null},
      last_publish_time = ${lastPublishTime || null},
      device_status = ${deviceStatus || 'online'},
      config_snapshot = ${configSnapshot ? JSON.stringify(configSnapshot) : null},
      monitor_data = ${monitorData ? JSON.stringify(monitorData) : null},
      last_heartbeat = NOW()
    WHERE pickup_code = ${pickupCode};
  `;

  return rowCount > 0;
}

/**
 * 2b. 获取单个设备/取件码的详细信息（含客户信息和监控数据）
 */
export async function getDeviceDetail(pickupCode) {
  const { rows } = await sql`
    SELECT
      p.pickup_code,
      p.device_id,
      p.device_alias,
      p.device_model,
      p.app_version,
      p.os_version,
      p.device_status,
      p.last_heartbeat,
      p.last_publish_time,
      p.is_active,
      p.config_snapshot,
      p.monitor_data,
      p.account_name,
      p.created_at AS code_created_at,
      c.customer_id,
      c.customer_name,
      c.plan,
      c.end_date,
      c.status AS customer_status
    FROM pickup_codes p
    JOIN customers c ON p.customer_id = c.customer_id
    WHERE p.pickup_code = ${pickupCode};
  `;

  return rows.length > 0 ? rows[0] : null;
}

/**
 * 3. 更新客户到期时间（续费）
 */
export async function updateCustomerEndDate(customerId, newEndDate) {
  const { rowCount } = await sql`
    UPDATE customers
    SET
      end_date = ${newEndDate},
      updated_at = NOW()
    WHERE customer_id = ${customerId};
  `;

  return rowCount > 0;
}

/**
 * 4. 为客户生成取件码
 * 格式: XN-{prefix}-{序号两位}-{4位随机字母数字}
 * 插入到 pickup_codes 表，关联 customer_id
 * 返回生成的取件码数组
 */
export async function generatePickupCodes(customerId, count, prefix) {
  const codes = [];

  for (let i = 1; i <= count; i++) {
    const seq = String(i).padStart(2, '0');
    const rand = generateRandomString(4);
    const code = `XN-${prefix}-${seq}-${rand}`;

    await sql`
      INSERT INTO pickup_codes (pickup_code, customer_id)
      VALUES (${code}, ${customerId});
    `;

    codes.push(code);
  }

  return codes;
}

/**
 * 5. 记录管理员操作日志
 */
export async function logAdminAction(adminId, action, targetType, targetId, detail) {
  await sql`
    INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail)
    VALUES (
      ${adminId},
      ${action},
      ${targetType || null},
      ${targetId || null},
      ${detail ? JSON.stringify(detail) : null}
    );
  `;
}

/**
 * 生成指定长度的随机字母数字字符串
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 6. 运营仪表盘统计数据
 * 一次性返回所有指标，用多条独立 SQL 查询实现
 */
export async function getDashboardStats() {
  // 客户总数
  const { rows: r1 } = await sql`SELECT COUNT(*)::int AS count FROM customers;`;
  const totalCustomers = r1[0].count;

  // 活跃客户数
  const { rows: r2 } = await sql`
    SELECT COUNT(*)::int AS count FROM customers
    WHERE end_date >= CURRENT_DATE AND status != 'suspended';
  `;
  const activeCustomers = r2[0].count;

  // 总设备数
  const { rows: r3 } = await sql`
    SELECT COUNT(*)::int AS count FROM pickup_codes
    WHERE device_id IS NOT NULL;
  `;
  const totalDevices = r3[0].count;

  // 在线设备数
  const { rows: r4 } = await sql`
    SELECT COUNT(*)::int AS count FROM pickup_codes
    WHERE last_heartbeat > NOW() - INTERVAL '24 hours';
  `;
  const onlineDevices = r4[0].count;

  // 即将到期客户列表（7天内）
  const { rows: expiringCustomers } = await sql`
    SELECT customer_id, customer_name, end_date, plan
    FROM customers
    WHERE end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND status != 'suspended'
    ORDER BY end_date ASC;
  `;

  // 已过期客户列表
  const { rows: expiredCustomers } = await sql`
    SELECT customer_id, customer_name, end_date, plan
    FROM customers
    WHERE end_date < CURRENT_DATE AND status != 'suspended'
    ORDER BY end_date DESC;
  `;

  // 离线设备列表（附带 customer_name）
  const { rows: offlineDevices } = await sql`
    SELECT p.pickup_code, p.customer_id, p.device_alias, p.device_model, p.last_heartbeat,
           c.customer_name
    FROM pickup_codes p
    LEFT JOIN customers c ON p.customer_id = c.customer_id
    WHERE p.device_id IS NOT NULL
      AND (p.last_heartbeat IS NULL OR p.last_heartbeat < NOW() - INTERVAL '24 hours')
    ORDER BY p.last_heartbeat ASC NULLS FIRST;
  `;

  return {
    totalCustomers,
    activeCustomers,
    totalDevices,
    onlineDevices,
    expiringCustomers,
    expiredCustomers,
    offlineDevices
  };
}

/**
 * 7. 分页查询操作日志
 * @param {number} page - 页码，从 1 开始，默认 1
 * @param {number} limit - 每页条数，默认 20
 */
export async function getAdminLogs(page = 1, limit = 20) {
  const offset = (page - 1) * limit;

  const { rows: countRows } = await sql`SELECT COUNT(*)::int AS total FROM admin_logs;`;
  const total = countRows[0].total;

  const { rows: logs } = await sql`
    SELECT * FROM admin_logs
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset};
  `;

  return { logs, total, page, limit };
}

/**
 * 8. 客户自助查询（通过取件码查客户全部信息）
 * @param {string} code - 取件码
 * @returns {{ customer, devices }} 或 null
 */
export async function getCustomerStatusByCode(code) {
  // 先通过取件码查到 customer_id
  const { rows: codeRows } = await sql`
    SELECT customer_id FROM pickup_codes WHERE pickup_code = ${code};
  `;

  if (codeRows.length === 0) return null;

  const customerId = codeRows[0].customer_id;

  // 查客户信息
  const { rows: customerRows } = await sql`
    SELECT * FROM customers WHERE customer_id = ${customerId};
  `;

  if (customerRows.length === 0) return null;

  const customer = customerRows[0];

  // 查该客户名下所有取件码和设备状态
  const { rows: devices } = await sql`
    SELECT pickup_code, device_alias, device_model, device_status, last_heartbeat, is_active, account_name
    FROM pickup_codes
    WHERE customer_id = ${customerId}
    ORDER BY created_at ASC;
  `;

  return { customer, devices };
}

/**
 * 9. 更新单个取件码信息
 * @param {string} code - pickup_code 主键
 * @param {Object} data - { isActive, deviceAlias }
 * @returns 更新后的记录，或 null
 */
export async function updatePickupCode(code, data) {
  const { isActive, deviceAlias, accountName } = data || {};

  const { rows } = await sql`
    UPDATE pickup_codes
    SET
      is_active = COALESCE(${isActive !== undefined ? isActive : null}, is_active),
      device_alias = COALESCE(${deviceAlias !== undefined ? deviceAlias : null}, device_alias),
      account_name = COALESCE(${accountName !== undefined ? accountName : null}, account_name)
    WHERE pickup_code = ${code}
    RETURNING *;
  `;

  return rows.length > 0 ? rows[0] : null;
}

/* =========================================
   Task 3d: 设备指令/通知
   ========================================= */

/**
 * 10. 创建设备指令
 */
export async function createDeviceCommand(pickupCode, commandType, payload) {
  const { rows } = await sql`
    INSERT INTO device_commands (pickup_code, command_type, payload)
    VALUES (${pickupCode}, ${commandType}, ${JSON.stringify(payload || {})})
    RETURNING *;
  `;
  return rows[0];
}

/**
 * 11. 获取设备待执行指令（心跳拉取）并标记为已发送
 */
export async function fetchAndMarkCommands(pickupCode) {
  const { rows } = await sql`
    UPDATE device_commands
    SET status = 'sent', sent_at = NOW()
    WHERE id IN (
      SELECT id FROM device_commands
      WHERE pickup_code = ${pickupCode} AND status = 'pending'
      ORDER BY created_at ASC
      LIMIT 10
    )
    RETURNING id, command_type, payload;
  `;
  return rows;
}

/**
 * 12. 查询设备指令历史（管理后台用，最近20条）
 */
export async function getDeviceCommandHistory(pickupCode) {
  const { rows } = await sql`
    SELECT * FROM device_commands
    WHERE pickup_code = ${pickupCode}
    ORDER BY created_at DESC
    LIMIT 20;
  `;
  return rows;
}

/* =========================================
   Task 4b: 订单/支付
   ========================================= */

/**
 * 13. 创建订单
 */
export async function createOrder(orderData) {
  const { orderId, customerId, pickupCode, plan, durationDays, amount, paymentChannel, detail } = orderData;
  const { rows } = await sql`
    INSERT INTO orders (order_id, customer_id, pickup_code, plan, duration_days, amount, payment_channel, detail)
    VALUES (
      ${orderId},
      ${customerId || null},
      ${pickupCode || null},
      ${plan},
      ${durationDays || 30},
      ${amount || 0},
      ${paymentChannel || null},
      ${detail ? JSON.stringify(detail) : '{}'}
    )
    RETURNING *;
  `;
  return rows[0];
}

/**
 * 14. 更新订单支付状态
 */
export async function updateOrderStatus(orderId, status, tradeNo) {
  const { rows } = await sql`
    UPDATE orders
    SET
      payment_status = ${status},
      trade_no = COALESCE(${tradeNo || null}, trade_no),
      paid_at = CASE WHEN ${status} = 'paid' THEN NOW() ELSE paid_at END
    WHERE order_id = ${orderId}
    RETURNING *;
  `;
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 15. 查询单个订单
 */
export async function getOrder(orderId) {
  const { rows } = await sql`
    SELECT * FROM orders WHERE order_id = ${orderId};
  `;
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 16. 收入统计（仪表盘用）
 */
export async function getRevenueStats() {
  // 总收入
  const { rows: r1 } = await sql`
    SELECT COALESCE(SUM(amount), 0)::int AS total
    FROM orders WHERE payment_status = 'paid';
  `;
  const totalRevenue = r1[0].total;

  // 本月收入
  const { rows: r2 } = await sql`
    SELECT COALESCE(SUM(amount), 0)::int AS total
    FROM orders
    WHERE payment_status = 'paid'
      AND paid_at >= date_trunc('month', CURRENT_DATE);
  `;
  const monthRevenue = r2[0].total;

  // 本月订单数
  const { rows: r3 } = await sql`
    SELECT COUNT(*)::int AS count
    FROM orders
    WHERE payment_status = 'paid'
      AND paid_at >= date_trunc('month', CURRENT_DATE);
  `;
  const monthOrders = r3[0].count;

  // 最近订单（最新10条）
  const { rows: recentOrders } = await sql`
    SELECT o.*, c.customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    ORDER BY o.created_at DESC
    LIMIT 10;
  `;

  return { totalRevenue, monthRevenue, monthOrders, recentOrders };
}

// ==================== AI 错误上报系统 ====================

/**
 * 注册设备并返回 Token（已注册则返回已有 Token）
 */
export async function registerDeviceToken(deviceId, deviceInfo) {
    const { rows: existing } = await sql`
        SELECT token FROM device_tokens WHERE device_id = ${deviceId};
    `;
    if (existing.length > 0) {
        return existing[0].token;
    }

    const crypto = await import('crypto');
    const token = crypto.randomBytes(64).toString('base64url');

    await sql`
        INSERT INTO device_tokens (device_id, token, device_brand, device_model, sdk_int, screen_width, screen_height)
        VALUES (
            ${deviceId},
            ${token},
            ${deviceInfo?.brand || null},
            ${deviceInfo?.model || null},
            ${deviceInfo?.sdkInt || null},
            ${deviceInfo?.width || null},
            ${deviceInfo?.height || null}
        );
    `;
    return token;
}

/**
 * 验证设备 Token，返回对应的 deviceId 或 null
 */
export async function verifyDeviceToken(token) {
    const { rows } = await sql`
        SELECT device_id FROM device_tokens
        WHERE token = ${token} AND expires_at > NOW();
    `;
    return rows.length > 0 ? rows[0].device_id : null;
}

/**
 * 检查 requestId 是否已存在（防重放），不存在则插入占位行
 * 返回 true = 新请求，false = 重复
 */
export async function checkAndInsertRequestId(requestId, deviceId) {
    try {
        await sql`
            INSERT INTO error_reports (request_id, device_id)
            VALUES (${requestId}, ${deviceId});
        `;
        return true;
    } catch (e) {
        if (e.code === '23505') return false;
        throw e;
    }
}

/**
 * 检查设备小时内请求次数（限流 100次/小时）
 * 返回 true = 未超限
 */
export async function checkDeviceRateLimit(deviceId, limit = 100) {
    const hourKey = new Date().toISOString().slice(0, 13);
    const { rows } = await sql`
        INSERT INTO device_rate_limits (device_id, hour_key, count)
        VALUES (${deviceId}, ${hourKey}, 1)
        ON CONFLICT (device_id, hour_key) DO UPDATE SET count = device_rate_limits.count + 1
        RETURNING count;
    `;
    return rows[0].count <= limit;
}

/**
 * 保存完整错误报告（更新 checkAndInsertRequestId 插入的占位行）
 */
export async function saveErrorReport(data) {
    const { rows } = await sql`
        UPDATE error_reports SET
            platform = ${data.platform || null},
            step = ${data.step || null},
            error_msg = ${data.errorMsg || null},
            screenshot = ${data.screenshot || null},
            screenshot_omitted = ${data.screenshotOmitted || false},
            state = ${data.state || null},
            ai_action = ${data.aiAction || null},
            ai_result = ${data.aiResult || null},
            extra = ${JSON.stringify(data.extra || {})},
            created_at = NOW()
        WHERE request_id = ${data.requestId}
        RETURNING id;
    `;
    return rows.length > 0 ? rows[0].id : null;
}

/**
 * 分页查询错误报告（管理后台用，不含 screenshot 大字段）
 */
export async function getErrorReports({ deviceId, platform, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    let countQuery;
    if (deviceId && platform) {
        const { rows } = await sql`SELECT COUNT(*)::int AS total FROM error_reports WHERE device_id = ${deviceId} AND platform = ${platform};`;
        countQuery = rows[0].total;
    } else if (deviceId) {
        const { rows } = await sql`SELECT COUNT(*)::int AS total FROM error_reports WHERE device_id = ${deviceId};`;
        countQuery = rows[0].total;
    } else if (platform) {
        const { rows } = await sql`SELECT COUNT(*)::int AS total FROM error_reports WHERE platform = ${platform};`;
        countQuery = rows[0].total;
    } else {
        const { rows } = await sql`SELECT COUNT(*)::int AS total FROM error_reports;`;
        countQuery = rows[0].total;
    }

    let reports;
    if (deviceId && platform) {
        const { rows } = await sql`
            SELECT id, request_id, device_id, platform, step, error_msg, screenshot_omitted, state, ai_action, ai_result, created_at
            FROM error_reports WHERE device_id = ${deviceId} AND platform = ${platform}
            ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};
        `;
        reports = rows;
    } else if (deviceId) {
        const { rows } = await sql`
            SELECT id, request_id, device_id, platform, step, error_msg, screenshot_omitted, state, ai_action, ai_result, created_at
            FROM error_reports WHERE device_id = ${deviceId}
            ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};
        `;
        reports = rows;
    } else if (platform) {
        const { rows } = await sql`
            SELECT id, request_id, device_id, platform, step, error_msg, screenshot_omitted, state, ai_action, ai_result, created_at
            FROM error_reports WHERE platform = ${platform}
            ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};
        `;
        reports = rows;
    } else {
        const { rows } = await sql`
            SELECT id, request_id, device_id, platform, step, error_msg, screenshot_omitted, state, ai_action, ai_result, created_at
            FROM error_reports
            ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset};
        `;
        reports = rows;
    }

    return { total: countQuery, reports, page, limit };
}

/**
 * 获取当前活跃的远程配置
 */
export async function getActiveDeviceConfig() {
    const { rows } = await sql`
        SELECT config_version, config_body, signature, last_updated
        FROM device_configs WHERE is_active = TRUE
        ORDER BY config_version DESC LIMIT 1;
    `;
    return rows.length > 0 ? rows[0] : null;
}

/**
 * 清理过期限流记录
 */
export async function cleanupRateLimits() {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 13);
    await sql`DELETE FROM device_rate_limits WHERE hour_key < ${cutoff};`;
}

