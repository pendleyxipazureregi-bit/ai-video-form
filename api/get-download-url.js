import COS from 'cos-nodejs-sdk-v5';

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 判断是否为视频文件
function isVideoFile(key, size = 0) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v'];
  const lowerKey = key.toLowerCase();
  
  // 1. 有视频扩展名的文件
  if (videoExtensions.some(ext => lowerKey.endsWith(ext))) {
    return true;
  }
  
  // 2. 大文件（> 1MB）且没有常见文件扩展名的，视为视频文件
  const isLargeFile = parseInt(size) > 1024 * 1024; // > 1MB
  if (isLargeFile) {
    // 常见的非视频文件扩展名
    const nonVideoExtensions = ['.txt', '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.rar', '.html', '.css', '.js', '.json'];
    const hasNonVideoExtension = nonVideoExtensions.some(ext => lowerKey.endsWith(ext));
    
    // 如果不是已知的非视频文件，就认为是视频
    if (!hasNonVideoExtension) {
      return true;
    }
  }
  
  return false;
}

export default async function handler(request, response) {
  // 1. 设置 CORS 头，允许跨域访问
  response.setHeader('Access-Control-Allow-Credentials', true);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 处理预检请求 (OPTIONS)
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    // 2. 初始化 COS
    const cos = new COS({
      SecretId: process.env.TENCENT_SECRET_ID,
      SecretKey: process.env.TENCENT_SECRET_KEY,
    });

    // 3. 获取参数 (从 body 中)
    const { pickupCode } = request.body || {};

    if (!pickupCode) {
      return response.status(400).json({ error: 'Missing parameters: pickupCode is required' });
    }

    const bucket = process.env.TENCENT_BUCKET;
    const region = process.env.TENCENT_REGION;

    // 所有行业文件夹列表
    const ALL_INDUSTRIES = [
      '康养旅居', '房产销售', '教育培训', '医疗健康',
      '旅游出行', '金融理财', '零售电商', '餐饮美食', '其他行业'
    ];

    // 4. 遍历所有行业文件夹，查找取件码对应的文件
    let videoFiles = [];
    let matchedIndustry = null;

    for (const industry of ALL_INDUSTRIES) {
      const prefix = `${industry}/${pickupCode}/`;

      const data = await new Promise((resolve, reject) => {
        cos.getBucket({
          Bucket: bucket,
          Region: region,
          Prefix: prefix,
          MaxKeys: 1000,
        }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const found = (data.Contents || []).filter(item => {
        if (parseInt(item.Size) === 0) return false;
        if (item.Key.endsWith('/')) return false;
        return isVideoFile(item.Key, item.Size);
      });

      if (found.length > 0) {
        videoFiles = found;
        matchedIndustry = industry;
        break; // 找到后立即停止遍历
      }
    }

    if (videoFiles.length === 0) {
      return response.status(404).json({
        success: false,
        message: '未找到该取件码对应的视频文件，请检查取件码是否正确'
      });
    }

    const files = await Promise.all(
      videoFiles.map(async (item) => {
        // 从 Key 中提取纯文件名
        const fileName = item.Key.split('/').pop();
        
        // 使用 Promise 包装获取签名 URL
        const url = await new Promise((resolve, reject) => {
          cos.getObjectUrl({
            Bucket: bucket,
            Region: region,
            Key: item.Key,
            Sign: true,
            Expires: 1800, // 30分钟有效
            Query: {
              // 强制浏览器下载而非在线播放，支持中文文件名
              'response-content-disposition': 'attachment; filename="' + encodeURIComponent(fileName) + '"'
            }
          }, (err, data) => {
            if (err) reject(err);
            else resolve(data.Url);
          });
        });

        const fileSize = parseInt(item.Size);

        return {
          key: item.Key, // 返回完整路径，用于前端解析账号名
          name: fileName, // 获取纯文件名
          url: url,
          size: fileSize,
          sizeFormatted: formatFileSize(fileSize),
          lastModified: item.LastModified,
        };
      })
    );

    // 按文件名排序
    files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    return response.status(200).json({
      success: true,
      folderName: pickupCode,
      industry: matchedIndustry,
      fileCount: files.length,
      files: files,
    });

  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
