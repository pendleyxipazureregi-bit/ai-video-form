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
      p.config_snapshot
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
    configSnapshot
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
      last_heartbeat = NOW()
    WHERE pickup_code = ${pickupCode};
  `;

  return rowCount > 0;
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

