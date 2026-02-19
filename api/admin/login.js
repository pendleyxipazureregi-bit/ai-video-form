// Vercel Serverless Function - 管理员登录 API
//
// POST: 验证用户名密码，签发 JWT Token

import crypto from 'crypto';
import { signAdminToken } from '../_lib/auth.js';

// 管理员账号（用户名明文，密码存 SHA-256 哈希）
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD_HASH = 'd85216e97f43ef18df4dec2656deb21e590950f06e6b3bcbb87b2c779db98348'; // SHA-256("ofai2026")

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '请求方法不允许'
    });
  }

  try {
    const { username, password } = req.body || {};

    // 参数验证
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '请提供用户名和密码'
      });
    }

    // 计算输入密码的 SHA-256 哈希
    const inputHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    // 验证用户名和密码
    if (username !== ADMIN_USERNAME || inputHash !== ADMIN_PASSWORD_HASH) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 签发 JWT Token
    const token = signAdminToken({ id: 'admin_001', username: 'admin' });

    return res.status(200).json({
      success: true,
      token,
      expiresIn: '7d'
    });

  } catch (error) {
    console.error('Admin Login Error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

