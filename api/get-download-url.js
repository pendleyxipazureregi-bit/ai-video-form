import COS from 'cos-nodejs-sdk-v5';

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
      }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    // 5. 生成预签名链接
    const files = await Promise.all(
      (data.Contents || [])
        .filter(item => parseInt(item.Size) > 0) // 过滤掉文件夹本身
        .map(async (item) => {
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

          return {
            name: item.Key.split('/').pop(), // 获取纯文件名
            url: url,
          };
        })
    );

    return response.status(200).json({ success: true, files });

  } catch (error) {
    console.error('API Error:', error);
    return response.status(500).json({ error: error.message });
  }
}
