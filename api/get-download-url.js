// Vercel Serverless Function - 腾讯云 COS 文件夹列表 & 预签名下载链接生成
import COS from 'cos-nodejs-sdk-v5'

// 初始化 COS 客户端（使用环境变量）
const cos = new COS({
  SecretId: process.env.TENCENT_SECRET_ID,
  SecretKey: process.env.TENCENT_SECRET_KEY
})

const BUCKET = process.env.TENCENT_BUCKET
const REGION = process.env.TENCENT_REGION

// 行业ID到文件夹名称的映射
const INDUSTRY_FOLDER_MAP = {
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

// 列出指定前缀下的所有文件
function listFiles(prefix) {
  return new Promise((resolve, reject) => {
    cos.getBucket({
      Bucket: BUCKET,
      Region: REGION,
      Prefix: prefix,
      MaxKeys: 100
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.Contents || [])
      }
    })
  })
}

// 生成预签名下载 URL
function getSignedUrl(key) {
  return new Promise((resolve, reject) => {
    cos.getObjectUrl({
      Bucket: BUCKET,
      Region: REGION,
      Key: key,
      Sign: true,
      Expires: 1800 // 30分钟有效期
    }, (err, data) => {
      if (err) {
        reject(err)
      } else {
        resolve(data.Url)
      }
    })
  })
}

// 从完整路径中提取文件名
function getFileName(key) {
  const parts = key.split('/')
  return parts[parts.length - 1]
}

// 判断是否为视频文件
function isVideoFile(key) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v']
  const lowerKey = key.toLowerCase()
  return videoExtensions.some(ext => lowerKey.endsWith(ext))
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
    const { pickupCode, industry } = req.body

    // 参数验证
    if (!pickupCode) {
      return res.status(400).json({
        success: false,
        message: '请提供取件码'
      })
    }

    if (!industry) {
      return res.status(400).json({
        success: false,
        message: '请选择行业'
      })
    }

    // 标准化取件码
    const normalizedCode = pickupCode.toString().trim()
    
    // 获取行业文件夹名称
    const industryFolder = INDUSTRY_FOLDER_MAP[industry] || industry

    // 构建搜索前缀：行业/取件码/
    const prefix = `${industryFolder}/${normalizedCode}/`

    console.log('=== COS Debug Info ===')
    console.log('Bucket:', BUCKET)
    console.log('Region:', REGION)
    console.log('Industry:', industry, '->', industryFolder)
    console.log('Pickup Code:', normalizedCode)
    console.log('Searching prefix:', prefix)

    // 列出该前缀下的所有文件
    const allObjects = await listFiles(prefix)
    
    console.log('Found objects:', allObjects.length)
    console.log('Objects:', JSON.stringify(allObjects, null, 2))

    // 过滤：排除文件夹本身，只保留视频文件
    const videoFiles = allObjects.filter(obj => {
      // 排除大小为0的对象（通常是文件夹）
      if (obj.Size === 0 || obj.Size === '0') return false
      // 排除以 / 结尾的（文件夹标记）
      if (obj.Key.endsWith('/')) return false
      // 只保留视频文件
      return isVideoFile(obj.Key)
    })

    // 如果没有找到任何文件
    if (videoFiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到该取件码对应的视频文件，请检查取件码是否正确'
      })
    }

    // 为每个文件生成预签名下载链接
    const filesWithUrls = await Promise.all(
      videoFiles.map(async (file) => {
        const url = await getSignedUrl(file.Key)
        const fileName = getFileName(file.Key)
        const fileSize = parseInt(file.Size)
        
        return {
          name: fileName,
          url: url,
          size: fileSize,
          sizeFormatted: formatFileSize(fileSize),
          lastModified: file.LastModified
        }
      })
    )

    // 按文件名排序
    filesWithUrls.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

    return res.status(200).json({
      success: true,
      folderName: normalizedCode,
      industry: industryFolder,
      fileCount: filesWithUrls.length,
      files: filesWithUrls
    })

  } catch (error) {
    console.error('COS Error:', error)
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    })
  }
}
