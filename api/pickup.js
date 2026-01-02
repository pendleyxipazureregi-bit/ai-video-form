// Vercel Serverless Function - 取件码验证 API
// 
// 说明：这是一个示例实现，实际使用时需要连接数据库
// 您可以使用以下方式存储数据：
// 1. Vercel KV (Redis)
// 2. Supabase
// 3. MongoDB Atlas
// 4. 其他数据库服务

// 示例取件码数据（实际应从数据库获取）
// 格式：取件码 -> 内容信息
const PICKUP_CODES = {
  '9090': {
    industry: 'elderly-care',
    contentTitle: '康养旅居一周获客视频',
    validPeriod: '2025年1月2日 - 1月8日',
    contentCount: 7,
    used: false,
    contents: [
      { title: '周一 - 森林氧吧养生篇', date: '1月2日', url: 'https://example.com/video1' },
      { title: '周二 - 营养配餐展示篇', date: '1月3日', url: 'https://example.com/video2' },
      { title: '周三 - 医养结合服务篇', date: '1月4日', url: 'https://example.com/video3' },
      { title: '周四 - 丰富活动记录篇', date: '1月5日', url: 'https://example.com/video4' },
      { title: '周五 - 适老化设计篇', date: '1月6日', url: 'https://example.com/video5' },
      { title: '周六 - 客户见证分享篇', date: '1月7日', url: 'https://example.com/video6' },
      { title: '周日 - 一周精华回顾篇', date: '1月8日', url: 'https://example.com/video7' }
    ]
  },
  'JHZN-2025': {
    industry: 'elderly-care',
    contentTitle: '康养旅居获客视频包',
    validPeriod: '2025年1月1日 - 1月7日',
    contentCount: 7,
    used: false,
    contents: [
      { title: '周一 - 森林氧吧养生篇', date: '1月1日', url: 'https://example.com/video1' },
      { title: '周二 - 营养配餐展示篇', date: '1月2日', url: 'https://example.com/video2' },
      { title: '周三 - 医养结合服务篇', date: '1月3日', url: 'https://example.com/video3' },
      { title: '周四 - 丰富活动记录篇', date: '1月4日', url: 'https://example.com/video4' },
      { title: '周五 - 适老化设计篇', date: '1月5日', url: 'https://example.com/video5' },
      { title: '周六 - 客户见证分享篇', date: '1月6日', url: 'https://example.com/video6' },
      { title: '周日 - 一周精华回顾篇', date: '1月7日', url: 'https://example.com/video7' }
    ]
  },
  'JHZN-TEST': {
    industry: 'elderly-care',
    contentTitle: '测试内容包',
    validPeriod: '测试有效期',
    contentCount: 3,
    used: false,
    contents: [
      { title: '测试视频1', date: '测试日期', url: 'https://example.com/test1' },
      { title: '测试视频2', date: '测试日期', url: 'https://example.com/test2' },
      { title: '测试视频3', date: '测试日期', url: 'https://example.com/test3' }
    ]
  }
}

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
    const { industry, code } = req.body

    // 参数验证
    if (!industry || !code) {
      return res.status(400).json({
        success: false,
        message: '请提供行业和取件码'
      })
    }

    // 标准化取件码（转大写，去空格）
    const normalizedCode = code.toUpperCase().trim()

    // 查找取件码
    const pickupData = PICKUP_CODES[normalizedCode]

    if (!pickupData) {
      return res.status(404).json({
        success: false,
        message: '取件码不存在，请检查后重试'
      })
    }

    // 验证行业是否匹配
    if (pickupData.industry !== industry) {
      return res.status(400).json({
        success: false,
        message: '取件码与所选行业不匹配'
      })
    }

    // 检查是否已使用（可选，根据业务需求）
    // if (pickupData.used) {
    //   return res.status(400).json({
    //     success: false,
    //     message: '此取件码已被使用'
    //   })
    // }

    // 返回内容信息
    return res.status(200).json({
      success: true,
      contentTitle: pickupData.contentTitle,
      validPeriod: pickupData.validPeriod,
      contentCount: pickupData.contentCount,
      contents: pickupData.contents
    })

  } catch (error) {
    console.error('Pickup API Error:', error)
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
}

