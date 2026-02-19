// Vercel Serverless Function - 仪表盘 API
//
// GET: 获取运营仪表盘统计数据

import { verifyAdmin } from '../lib/auth.js';
import { getDashboardStats } from '../lib/db.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
    // ==================== GET: 仪表盘统计 ====================
    if (req.method === 'GET') {
      const stats = await getDashboardStats();

      return res.status(200).json({
        success: true,
        ...stats
      });
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

