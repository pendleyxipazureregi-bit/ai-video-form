// Vercel Serverless Function - 客户自助查询 API
//
// GET: 客户输入取件码查询自己的客户信息和设备状态
// 不需要 JWT 认证（面向客户使用）

import { getCustomerStatusByCode } from '../_lib/db.js';

export default async function handler(req, res) {
  // 设置 CORS 头（不需要 Authorization）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ==================== GET: 客户自助查询 ====================
    if (req.method === 'GET') {
      const { code } = req.query || {};

      if (!code) {
        return res.status(400).json({
          success: false,
          message: '缺少 code 参数'
        });
      }

      const result = await getCustomerStatusByCode(code);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: '取件码不存在'
        });
      }

      const { customer, devices } = result;

      // 映射设备列表，计算 isOnline
      const now = new Date();
      const deviceList = devices.map(d => ({
        pickupCode: d.pickup_code,
        deviceAlias: d.device_alias,
        deviceModel: d.device_model,
        isOnline: d.last_heartbeat
          ? (now - new Date(d.last_heartbeat)) < 24 * 60 * 60 * 1000
          : false,
        lastHeartbeat: d.last_heartbeat,
        accountName: d.account_name
      }));

      return res.status(200).json({
        success: true,
        customerName: customer.customer_name,
        plan: customer.plan,
        startDate: customer.start_date,
        endDate: customer.end_date,
        status: customer.status,
        devices: deviceList
      });
    }

    // 其他方法不允许
    return res.status(405).json({
      success: false,
      message: '请求方法不允许'
    });

  } catch (error) {
    console.error('Customer Status API Error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

