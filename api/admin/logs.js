// Vercel Serverless Function - 操作日志 API
//
// GET: 分页查询操作日志

import { verifyAdmin } from '../_lib/auth.js';
import { getAdminLogs } from '../_lib/db.js';

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
    // ==================== GET: 操作日志列表 ====================
    if (req.method === 'GET') {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      const result = await getAdminLogs(page, limit);

      return res.status(200).json({
        success: true,
        logs: result.logs,
        total: result.total,
        page: result.page,
        limit: result.limit
      });
    }

    // 其他方法不允许
    return res.status(405).json({
      success: false,
      message: '请求方法不允许'
    });

  } catch (error) {
    console.error('Logs API Error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

