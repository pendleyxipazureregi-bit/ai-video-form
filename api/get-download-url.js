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
function isVideoFile(key) {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v'];
  const lowerKey = key.toLowerCase();
  return videoExtensions.some(ext => lowerKey.endsWith(ext));
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
    const { industry, pickupCode } = request.body || {};

    if (!industry || !pickupCode) {
      return response.status(400).json({ error: 'Missing parameters' });
    }

    const bucket = process.env.TENCENT_BUCKET;
    const region = process.env.TENCENT_REGION;
    // 注意：这里确保路径最后有斜杠，表示搜索文件夹
    const prefix = `${industry}/${pickupCode}/`;

    // 4. 获取文件列表
    const data = await new Promise((resolve, reject) => {
      cos.getBucket({
        Bucket: bucket,
        Region: region,
        Prefix: prefix,
        MaxKeys: 1000, // 增大限制以获取更多文件
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // 5. 过滤并生成预签名链接
    const videoFiles = (data.Contents || []).filter(item => {
      // 排除大小为0的对象（通常是文件夹）
      if (parseInt(item.Size) === 0) return false;
      // 排除以 / 结尾的（文件夹标记）
      if (item.Key.endsWith('/')) return false;
      // 只保留视频文件
      return isVideoFile(item.Key);
    });

    if (videoFiles.length === 0) {
      return response.status(404).json({
        success: false,
        message: '未找到该取件码对应的视频文件，请检查取件码是否正确'
      });
    }

    const files = await Promise.all(
      videoFiles.map(async (item) => {
        // 使用 Promise 包装获取签名 URL
        const url = await new Promise((resolve, reject) => {
          cos.getObjectUrl({
            Bucket: bucket,
            Region: region,
            Key: item.Key,
            Sign: true,
            Expires: 1800, // 30分钟有效
          }, (err, data) => {
            if (err) reject(err);
            else resolve(data.Url);
          });
        });

        const fileSize = parseInt(item.Size);

        return {
          key: item.Key, // 返回完整路径，用于前端解析账号名
          name: item.Key.split('/').pop(), // 获取纯文件名
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
      industry: industry,
      fileCount: files.length,
      files: files,
    });

  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
