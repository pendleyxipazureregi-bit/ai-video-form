// Vercel Serverless Function - 钉钉 Webhook 代理
// 更新时间: 2025-12-20
const DINGTALK_WEBHOOK = process.env.DINGTALK_WEBHOOK_URL || 'https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN_HERE'

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const response = await fetch(DINGTALK_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    })

    const result = await response.json()
    return res.status(200).json(result)
  } catch (error) {
    return res.status(500).json({ 
      errcode: -1, 
      errmsg: error.message || '服务器错误' 
    })
  }
}

