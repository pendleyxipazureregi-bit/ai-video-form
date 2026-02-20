// Vercel Serverless Function - 仪表盘 & 订单/收入 API
//
// GET:  获取运营仪表盘统计数据（?type=revenue 获取收入统计）
// POST: 创建订单（手动录入）
// PUT:  更新订单状态

import { verifyAdmin } from '../_lib/auth.js';
import { getDashboardStats, getRevenueStats, createOrder, updateOrderStatus, getOrder, logAdminAction } from '../_lib/db.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
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
    // ==================== GET: 仪表盘统计 / 收入统计 ====================
    if (req.method === 'GET') {
      const { type } = req.query || {};

      // 收入统计模式
      if (type === 'revenue') {
        const revenue = await getRevenueStats();
        return res.status(200).json({ success: true, ...revenue });
      }

      // 默认：仪表盘概览
      const stats = await getDashboardStats();
      return res.status(200).json({ success: true, ...stats });
    }

    // ==================== POST: 创建订单（手动录入） ====================
    if (req.method === 'POST') {
      const { customerId, pickupCode, plan, durationDays, amount, paymentChannel, detail } = req.body || {};

      if (!plan || !amount) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段: plan, amount'
        });
      }

      // 生成订单号 ORD-时间戳-随机
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const order = await createOrder({
        orderId,
        customerId: customerId ? parseInt(customerId) : null,
        pickupCode: pickupCode || null,
        plan,
        durationDays: durationDays ? parseInt(durationDays) : 30,
        amount: parseFloat(amount),
        paymentChannel: paymentChannel || 'manual',
        detail: detail || {}
      });

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'create_order',
        'order',
        orderId,
        { customerId, plan, amount, paymentChannel }
      );

      return res.status(200).json({ success: true, order });
    }

    // ==================== PUT: 更新订单状态 ====================
    if (req.method === 'PUT') {
      const { orderId, status, tradeNo } = req.body || {};

      if (!orderId || !status) {
        return res.status(400).json({
          success: false,
          message: '缺少必填字段: orderId, status'
        });
      }

      const allowedStatuses = ['pending', 'paid', 'failed', 'refunded', 'cancelled'];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `不合法的状态: ${status}，允许: ${allowedStatuses.join(', ')}`
        });
      }

      const order = await updateOrderStatus(orderId, status, tradeNo);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: '订单不存在'
        });
      }

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'update_order',
        'order',
        orderId,
        { status, tradeNo }
      );

      return res.status(200).json({ success: true, order });
    }

    // 其他方法不允许
    return res.status(405).json({
      success: false,
      message: '请求方法不允许'
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

