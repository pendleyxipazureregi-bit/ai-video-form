import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 模拟文件数据（开发环境使用）
const MOCK_FILES = {
  '康养旅居': {
    '888': [
      { name: '第一天-森林氧吧养生篇.mp4', size: 52428800 },
      { name: '第二天-营养配餐展示篇.mp4', size: 48234567 },
      { name: '第三天-医养结合服务篇.mp4', size: 55123456 },
      { name: '第四天-丰富活动记录篇.mp4', size: 43567890 },
      { name: '第五天-适老化设计篇.mp4', size: 51234567 },
      { name: '第六天-客户见证分享篇.mp4', size: 47890123 },
      { name: '第七天-一周精华回顾篇.mp4', size: 62345678 }
    ],
    '9090': [
      { name: '康养基地宣传片.mp4', size: 125829120 },
      { name: '入住指南.mp4', size: 35678901 },
      { name: '设施介绍.mp4', size: 42345678 }
    ],
    'test': [
      { name: '测试视频1.mp4', size: 10485760 },
      { name: '测试视频2.mp4', size: 20971520 }
    ]
  },
  '房产销售': {
    '1234': [
      { name: '楼盘介绍.mp4', size: 85123456 },
      { name: '户型展示.mp4', size: 45678901 },
      { name: '周边配套.mp4', size: 38901234 }
    ]
  }
}

// 行业ID到文件夹名称的映射
const INDUSTRY_MAP = {
  'elderly-care': '康养旅居',
  'real-estate': '房产销售',
  'education': '教育培训',
  'healthcare': '医疗健康',
  'tourism': '旅游出行',
  'finance': '金融理财',
  'retail': '零售电商',
  'food': '餐饮美食',
  'other': '其他行业'
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 开发环境 API 模拟插件
function mockApiPlugin() {
  return {
    name: 'mock-api',
    configureServer(server) {
      // 处理 /api/get-download-url 请求（文件夹列表）
      server.middlewares.use('/api/get-download-url', (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { pickupCode } = JSON.parse(body)
              
              res.setHeader('Content-Type', 'application/json')

              if (!pickupCode) {
                res.statusCode = 400
                res.end(JSON.stringify({
                  success: false,
                  message: '请提供取件码'
                }))
                return
              }

              const normalizedCode = pickupCode.toString().trim()
              
              // 遍历所有行业查找取件码
              let files = null
              let matchedIndustry = null
              for (const [industryName, codes] of Object.entries(MOCK_FILES)) {
                if (codes[normalizedCode]) {
                  files = codes[normalizedCode]
                  matchedIndustry = industryName
                  break
                }
              }

              if (!files || files.length === 0) {
                res.statusCode = 404
                res.end(JSON.stringify({
                  success: false,
                  message: '未找到该取件码对应的视频文件，请检查取件码是否正确'
                }))
                return
              }

              // 生成模拟的文件列表（带预签名URL）
              const filesWithUrls = files.map((file, index) => ({
                name: file.name,
                url: `https://www.w3schools.com/html/mov_bbb.mp4?file=${encodeURIComponent(file.name)}`,
                size: file.size,
                sizeFormatted: formatFileSize(file.size),
                lastModified: new Date().toISOString()
              }))

              res.end(JSON.stringify({
                success: true,
                folderName: normalizedCode,
                industry: matchedIndustry,
                fileCount: filesWithUrls.length,
                files: filesWithUrls
              }))
            } catch (e) {
              res.statusCode = 400
              res.end(JSON.stringify({ success: false, message: '请求格式错误' }))
            }
          })
        } else {
          res.statusCode = 405
          res.end(JSON.stringify({ success: false, message: '方法不允许' }))
        }
      })

      // 处理 /api/dingtalk 请求（模拟成功响应）
      server.middlewares.use('/api/dingtalk', (req, res) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ errcode: 0, errmsg: 'ok' }))
          })
        } else {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), mockApiPlugin()],
})
