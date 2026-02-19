/**
 * Admin API 请求工具函数
 */

/**
 * 封装带 JWT 认证的 fetch 请求
 * 自动处理 401 未授权响应
 */
export async function adminFetch(url, options = {}) {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (res.status === 401) {
    localStorage.removeItem('admin_token')
    window.location.href = '/admin/login'
    throw new Error('认证已过期')
  }
  return res.json()
}

/**
 * 格式化日期为 YYYY/MM/DD
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 将日期转换为相对时间描述
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '从未上报'
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

/**
 * 计算距离目标日期的剩余天数
 */
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

