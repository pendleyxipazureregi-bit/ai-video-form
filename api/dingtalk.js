// Vercel Serverless Function - 钉钉 Webhook 代理
// 更新时间: 2025-12-20
const DINGTALK_WEBHOOK = 'https://oapi.dingtalk.com/robot/send?access_token=8eea0d7afa945d0a5c46bc9533932ec8685726e72a5d83d69d0a3ab260170efc'

export default async function handler(req, res) {
  console.log('收到请求数据:', req.body)
  console.log('请求方法:', req.method)
  
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
    console.error('钉钉发送失败:', error)
    return res.status(500).json({ 
      errcode: -1, 
      errmsg: error.message || '服务器错误' 
    })
  }
}

