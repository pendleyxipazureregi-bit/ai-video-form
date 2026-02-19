// Vercel Serverless Function - 取件码验证 API
//
// 从数据库查询取件码关联的客户信息

import { getCustomerByPickupCode } from './lib/db.js'

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: '请求方法不允许' 
    })
  }

  try {
    const { code } = req.body

    // 参数验证
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '请提供取件码'
      })
    }

    // 标准化取件码（去空格）
    const normalizedCode = code.trim()

    // 查数据库
    const record = await getCustomerByPickupCode(normalizedCode)

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '取件码不存在，请检查后重试'
      })
    }

    // 返回客户信息
    return res.status(200).json({
      success: true,
      customerName: record.customer_name,
      pickupCode: record.pickup_code,
      plan: record.plan,
      status: record.status,
      endDate: record.end_date,
      isActive: record.is_active
    })

  } catch (error) {
    console.error('Pickup API Error:', error)
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
}
