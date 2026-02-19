// Vercel Serverless Function - 单个客户详情 + 修改 API
//
// GET: 客户详情 + 名下所有设备
// PUT: 修改客户信息（COALESCE 保留未提供字段）

import { sql } from '@vercel/postgres';
import { verifyAdmin } from '../_lib/auth.js';
import { logAdminAction } from '../_lib/db.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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

  // 获取客户 ID
  const customerId = req.query.id;
  if (!customerId) {
    return res.status(400).json({
      success: false,
      message: '请提供客户 ID'
    });
  }

  try {
    // ==================== GET: 客户详情 ====================
    if (req.method === 'GET') {
      // 查询客户基本信息
      const customerResult = await sql`
        SELECT * FROM customers WHERE customer_id = ${customerId};
      `;

      if (customerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '客户不存在'
        });
      }

      // 查询该客户名下所有取件码和设备信息
      const devicesResult = await sql`
        SELECT * FROM pickup_codes WHERE customer_id = ${customerId} ORDER BY created_at DESC;
      `;

      return res.status(200).json({
        success: true,
        customer: customerResult.rows[0],
        devices: devicesResult.rows
      });
    }

    // ==================== PUT: 修改客户 ====================
    if (req.method === 'PUT') {
      const {
        customerName,
        contact,
        plan,
        maxDevices,
        endDate,
        status,
        notes
      } = req.body || {};

      // 先检查客户是否存在
      const existCheck = await sql`
        SELECT customer_id FROM customers WHERE customer_id = ${customerId};
      `;

      if (existCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '客户不存在'
        });
      }

      // 使用 COALESCE 模式：未提供的字段保持原值
      // 对于每个字段，如果前端传了值就用新值，否则用 null 让 COALESCE 取原值
      const { rows } = await sql`
        UPDATE customers
        SET
          customer_name = COALESCE(${customerName !== undefined ? customerName : null}, customer_name),
          contact       = COALESCE(${contact !== undefined ? contact : null}, contact),
          plan          = COALESCE(${plan !== undefined ? plan : null}, plan),
          max_devices   = COALESCE(${maxDevices !== undefined ? maxDevices : null}, max_devices),
          end_date      = COALESCE(${endDate !== undefined ? endDate : null}, end_date),
          status        = COALESCE(${status !== undefined ? status : null}, status),
          notes         = COALESCE(${notes !== undefined ? notes : null}, notes),
          updated_at    = NOW()
        WHERE customer_id = ${customerId}
        RETURNING *;
      `;

      // 记录哪些字段被修改了
      const changedFields = {};
      if (customerName !== undefined) changedFields.customerName = customerName;
      if (contact !== undefined) changedFields.contact = contact;
      if (plan !== undefined) changedFields.plan = plan;
      if (maxDevices !== undefined) changedFields.maxDevices = maxDevices;
      if (endDate !== undefined) changedFields.endDate = endDate;
      if (status !== undefined) changedFields.status = status;
      if (notes !== undefined) changedFields.notes = notes;

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'update_customer',
        'customer',
        String(customerId),
        { changedFields }
      );

      return res.status(200).json({
        success: true,
        customer: rows[0]
      });
    }

    // 其他方法不允许
    return res.status(405).json({
      success: false,
      message: '请求方法不允许'
    });

  } catch (error) {
    console.error('Customer API Error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

