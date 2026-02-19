// Vercel Serverless Function - 取件码管理 API
//
// POST: 为客户追加生成取件码
// PUT:  修改取件码（停用/启用/设置别名）

import { verifyAdmin } from '../lib/auth.js';
import { generatePickupCodes, logAdminAction, updatePickupCode } from '../lib/db.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // JWT 认证
  const auth = verifyAdmin(req);
  if (!auth.valid) {
    return res.status(401).json({
      success: false,
      message: auth.error
    });
  }

  try {
    // ==================== POST: 为客户追加生成取件码 ====================
    if (req.method === 'POST') {
      const { customerId } = req.query || {};
      const { count, prefix } = req.body || {};

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: '缺少 customerId 参数'
        });
      }

      if (!count || count < 1) {
        return res.status(400).json({
          success: false,
          message: '缺少 count 参数或数量不合法'
        });
      }

      const codes = await generatePickupCodes(
        parseInt(customerId),
        parseInt(count),
        prefix || 'CODE'
      );

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'generate_codes',
        'customer',
        String(customerId),
        { count: parseInt(count), prefix: prefix || 'CODE', codes }
      );

      return res.status(200).json({
        success: true,
        codes
      });
    }

    // ==================== PUT: 修改取件码 ====================
    if (req.method === 'PUT') {
      const { code } = req.query || {};
      const { isActive, deviceAlias } = req.body || {};

      if (!code) {
        return res.status(400).json({
          success: false,
          message: '缺少 code 参数'
        });
      }

      const pickupCode = await updatePickupCode(code, { isActive, deviceAlias });

      if (!pickupCode) {
        return res.status(404).json({
          success: false,
          message: '取件码不存在'
        });
      }

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'update_code',
        'pickup_code',
        code,
        { isActive, deviceAlias }
      );

      return res.status(200).json({
        success: true,
        pickupCode
      });
    }

    // 其他方法不允许
    return res.status(405).json({
      success: false,
      message: '请求方法不允许'
    });

  } catch (error) {
    console.error('Codes API Error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

