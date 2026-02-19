// Vercel Serverless Function - 客户列表 + 新建客户 API
//
// GET:  客户列表（支持 status/search 筛选，附带设备统计）
// POST: 新建客户（可同时生成取件码）

import { sql } from '@vercel/postgres';
import { verifyAdmin } from '../lib/auth.js';
import { generatePickupCodes, logAdminAction } from '../lib/db.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    // ==================== GET: 客户列表 ====================
    if (req.method === 'GET') {
      const { status, search } = req.query || {};

      let rows;

      if (status === 'active' && search) {
        // active + search
        const searchPattern = `%${search}%`;
        const result = await sql`
          SELECT
            c.*,
            COALESCE(d.device_count, 0)::int AS device_count,
            COALESCE(d.online_count, 0)::int AS online_count
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              COUNT(*)::int AS device_count,
              COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS online_count
            FROM pickup_codes
            GROUP BY customer_id
          ) d ON c.customer_id = d.customer_id
          WHERE c.end_date >= CURRENT_DATE
            AND c.status != 'suspended'
            AND c.customer_name ILIKE ${searchPattern}
          ORDER BY c.created_at DESC;
        `;
        rows = result.rows;

      } else if (status === 'active') {
        // active only
        const result = await sql`
          SELECT
            c.*,
            COALESCE(d.device_count, 0)::int AS device_count,
            COALESCE(d.online_count, 0)::int AS online_count
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              COUNT(*)::int AS device_count,
              COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS online_count
            FROM pickup_codes
            GROUP BY customer_id
          ) d ON c.customer_id = d.customer_id
          WHERE c.end_date >= CURRENT_DATE
            AND c.status != 'suspended'
          ORDER BY c.created_at DESC;
        `;
        rows = result.rows;

      } else if (status === 'expired' && search) {
        // expired + search
        const searchPattern = `%${search}%`;
        const result = await sql`
          SELECT
            c.*,
            COALESCE(d.device_count, 0)::int AS device_count,
            COALESCE(d.online_count, 0)::int AS online_count
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              COUNT(*)::int AS device_count,
              COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS online_count
            FROM pickup_codes
            GROUP BY customer_id
          ) d ON c.customer_id = d.customer_id
          WHERE c.end_date < CURRENT_DATE
            AND c.customer_name ILIKE ${searchPattern}
          ORDER BY c.created_at DESC;
        `;
        rows = result.rows;

      } else if (status === 'expired') {
        // expired only
        const result = await sql`
          SELECT
            c.*,
            COALESCE(d.device_count, 0)::int AS device_count,
            COALESCE(d.online_count, 0)::int AS online_count
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              COUNT(*)::int AS device_count,
              COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS online_count
            FROM pickup_codes
            GROUP BY customer_id
          ) d ON c.customer_id = d.customer_id
          WHERE c.end_date < CURRENT_DATE
          ORDER BY c.created_at DESC;
        `;
        rows = result.rows;

      } else if (status === 'suspended' && search) {
        // suspended + search
        const searchPattern = `%${search}%`;
        const result = await sql`
          SELECT
            c.*,
            COALESCE(d.device_count, 0)::int AS device_count,
            COALESCE(d.online_count, 0)::int AS online_count
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              COUNT(*)::int AS device_count,
              COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS online_count
            FROM pickup_codes
            GROUP BY customer_id
          ) d ON c.customer_id = d.customer_id
          WHERE c.status = 'suspended'
            AND c.customer_name ILIKE ${searchPattern}
          ORDER BY c.created_at DESC;
        `;
        rows = result.rows;

      } else if (status === 'suspended') {
        // suspended only
        const result = await sql`
          SELECT
            c.*,
            COALESCE(d.device_count, 0)::int AS device_count,
            COALESCE(d.online_count, 0)::int AS online_count
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              COUNT(*)::int AS device_count,
              COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS online_count
            FROM pickup_codes
            GROUP BY customer_id
          ) d ON c.customer_id = d.customer_id
          WHERE c.status = 'suspended'
          ORDER BY c.created_at DESC;
        `;
        rows = result.rows;

      } else if (search) {
        // search only (no status filter)
        const searchPattern = `%${search}%`;
        const result = await sql`
          SELECT
            c.*,
            COALESCE(d.device_count, 0)::int AS device_count,
            COALESCE(d.online_count, 0)::int AS online_count
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              COUNT(*)::int AS device_count,
              COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS online_count
            FROM pickup_codes
            GROUP BY customer_id
          ) d ON c.customer_id = d.customer_id
          WHERE c.customer_name ILIKE ${searchPattern}
          ORDER BY c.created_at DESC;
        `;
        rows = result.rows;

      } else {
        // no filters
        const result = await sql`
          SELECT
            c.*,
            COALESCE(d.device_count, 0)::int AS device_count,
            COALESCE(d.online_count, 0)::int AS online_count
          FROM customers c
          LEFT JOIN (
            SELECT
              customer_id,
              COUNT(*)::int AS device_count,
              COUNT(CASE WHEN last_heartbeat > NOW() - INTERVAL '24 hours' THEN 1 END)::int AS online_count
            FROM pickup_codes
            GROUP BY customer_id
          ) d ON c.customer_id = d.customer_id
          ORDER BY c.created_at DESC;
        `;
        rows = result.rows;
      }

      return res.status(200).json({
        success: true,
        customers: rows
      });
    }

    // ==================== POST: 新建客户 ====================
    if (req.method === 'POST') {
      const {
        customerName,
        contact,
        plan,
        maxDevices,
        startDate,
        endDate,
        notes,
        codeCount,
        codePrefix
      } = req.body || {};

      // 参数验证
      if (!customerName) {
        return res.status(400).json({
          success: false,
          message: '客户名称不能为空'
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: '开始日期和结束日期不能为空'
        });
      }

      // 插入客户
      const { rows } = await sql`
        INSERT INTO customers (customer_name, contact, plan, max_devices, start_date, end_date, notes)
        VALUES (
          ${customerName},
          ${contact || null},
          ${plan || 'trial'},
          ${maxDevices || 10},
          ${startDate},
          ${endDate},
          ${notes || null}
        )
        RETURNING *;
      `;

      const newCustomer = rows[0];

      // 生成取件码（如果需要）
      let codes = [];
      if (codeCount && codeCount > 0) {
        codes = await generatePickupCodes(
          newCustomer.customer_id,
          codeCount,
          codePrefix || customerName.slice(0, 4)
        );
      }

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'create_customer',
        'customer',
        String(newCustomer.customer_id),
        { customerName, plan: plan || 'trial', codeCount: codeCount || 0 }
      );

      return res.status(201).json({
        success: true,
        customer: newCustomer,
        codes
      });
    }

    // 其他方法不允许
    return res.status(405).json({
      success: false,
      message: '请求方法不允许'
    });

  } catch (error) {
    console.error('Customers API Error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

