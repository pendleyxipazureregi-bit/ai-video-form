import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * 签发管理员 JWT Token
 * @param {Object} payload - { id, username }
 * @returns {string} JWT token
 */
export function signAdminToken(payload) {
  return jwt.sign(
    { id: payload.id, username: payload.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * 验证管理员 JWT Token
 * 从请求头 Authorization: Bearer <token> 中提取并验证
 * @param {Object} req - HTTP 请求对象
 * @returns {Object} { valid: true, admin: { id, username } } 或 { valid: false, error: "..." }
 */
export function verifyAdmin(req) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';

    if (!authHeader) {
      return { valid: false, error: '未提供认证令牌' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, error: '认证格式错误，需要 Bearer Token' };
    }

    const token = authHeader.slice(7);

    if (!token) {
      return { valid: false, error: '令牌为空' };
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    return {
      valid: true,
      admin: { id: decoded.id, username: decoded.username }
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: '令牌已过期，请重新登录' };
    }
    if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: '令牌无效' };
    }
    return { valid: false, error: '认证失败' };
  }
}

