import crypto from 'crypto';

const MEMBERSHIP_SECRET = process.env.MEMBERSHIP_SECRET;

/**
 * 将 Buffer 或字符串转为 base64url 编码
 */
function toBase64Url(input) {
  const str = Buffer.isBuffer(input) ? input.toString('base64') : Buffer.from(input).toString('base64');
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * 将 base64url 字符串解码为普通字符串
 */
function fromBase64Url(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * 用 HMAC-SHA256 对数据签名
 */
function sign(data) {
  return crypto.createHmac('sha256', MEMBERSHIP_SECRET).update(data).digest();
}

/**
 * 1. 生成签名凭证
 *
 * payload 内容: { pickupCode, customerName, plan, endDate, graceStatus }
 * 自动添加 issuedAt (当前时间) 和 expiresAt (7天后)
 * 签名方式: HMAC-SHA256
 * 返回格式: base64url(JSON.stringify(fullPayload)) + "." + base64url(hmac签名)
 */
export function generateSignedToken(payload) {
  const now = Date.now();
  const fullPayload = {
    ...payload,
    issuedAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000 // 7 天后
  };

  const payloadStr = JSON.stringify(fullPayload);
  const payloadB64 = toBase64Url(payloadStr);
  const signature = sign(payloadB64);
  const signatureB64 = toBase64Url(signature);

  return `${payloadB64}.${signatureB64}`;
}

/**
 * 2. 验证签名凭证
 *
 * 解析 token，验证 HMAC 签名，检查 expiresAt 是否过期
 * 返回: { valid: true, payload: {...} } 或 { valid: false, reason: "expired" | "invalid_signature" | "malformed" }
 */
export function verifySignedToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'malformed' };
    }

    const [payloadB64, signatureB64] = parts;

    // 验证签名
    const expectedSignature = toBase64Url(sign(payloadB64));
    if (expectedSignature !== signatureB64) {
      return { valid: false, reason: 'invalid_signature' };
    }

    // 解析 payload
    const payloadStr = fromBase64Url(payloadB64);
    const payload = JSON.parse(payloadStr);

    // 检查是否过期
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true, payload };

  } catch (e) {
    return { valid: false, reason: 'malformed' };
  }
}

