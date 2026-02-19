import { getCustomerByPickupCode } from '../_lib/db.js';
import { generateSignedToken } from '../_lib/token.js';
import { sql } from '@vercel/postgres';

// graceStatus 对应的提示信息
const STATUS_MESSAGES = {
  normal: '服务正常',
  warning: '服务即将到期，请及时续费',
  grace: '服务已到期，宽限期内仍可使用',
  degraded: '服务已到期，自动发布已暂停',
  stopped: '服务已停止，请联系管理员续费'
};

/**
 * 根据剩余天数计算 graceStatus
 */
function calcGraceStatus(daysRemaining) {
  if (daysRemaining > 7) return 'normal';
  if (daysRemaining >= 1) return 'warning';
  if (daysRemaining >= -3) return 'grace';
  if (daysRemaining >= -7) return 'degraded';
  return 'stopped';
}

/**
 * 计算两个日期之间的天数差（endDate - today）
 */
function calcDaysRemaining(endDate) {
  const end = new Date(endDate);
  const today = new Date();
  // 只比较日期部分，忽略时间
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      valid: false,
      message: '请求方法不允许'
    });
  }

  try {
    const { pickupCode, deviceId } = req.body || {};

    // 1. 验证参数
    if (!pickupCode) {
      return res.status(400).json({
        valid: false,
        message: '请提供取件码'
      });
    }

    // 2. 查数据库
    const record = await getCustomerByPickupCode(pickupCode);

    // 3. 取件码不存在或已停用
    if (!record || !record.is_active) {
      return res.status(200).json({
        valid: false,
        message: '取件码无效或已停用'
      });
    }

    // 4. 客户被暂停
    if (record.status === 'suspended') {
      return res.status(200).json({
        valid: false,
        message: '服务已被暂停，请联系管理员'
      });
    }

    // 5. 计算会员状态
    const daysRemaining = calcDaysRemaining(record.end_date);
    const graceStatus = calcGraceStatus(daysRemaining);

    // 6. 首次绑定设备：如果传了 deviceId 且数据库中 device_id 为空
    if (deviceId && !record.device_id) {
      await sql`
        UPDATE pickup_codes
        SET device_id = ${deviceId}
        WHERE pickup_code = ${pickupCode};
      `;
    }

    // 7. 生成离线签名凭证
    const signedToken = generateSignedToken({
      pickupCode,
      customerName: record.customer_name,
      plan: record.plan,
      endDate: record.end_date,
      graceStatus
    });

    // 8. 返回成功响应
    return res.status(200).json({
      valid: true,
      customerName: record.customer_name,
      plan: record.plan,
      startDate: record.start_date,
      endDate: record.end_date,
      daysRemaining,
      graceStatus,
      message: STATUS_MESSAGES[graceStatus],
      signedToken,
      configSnapshot: record.config_snapshot || null
    });

  } catch (error) {
    console.error('Membership Check Error:', error);
    return res.status(500).json({
      valid: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

