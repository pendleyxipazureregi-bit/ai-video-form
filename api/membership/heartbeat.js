import { getCustomerByPickupCode, upsertDevice, fetchAndMarkCommands } from '../_lib/db.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      message: '请求方法不允许'
    });
  }

  try {
    const {
      pickupCode,
      deviceId,
      deviceModel,
      appVersion,
      osVersion,
      lastPublishTime,
      configSnapshot,
      // 新增监控字段
      batteryLevel,
      wifiConnected,
      todayPublishCount,
      todayPlatforms,
      cycleDay,
      pendingVideos,
      lastError,
      uptimeMinutes
    } = req.body || {};

    // 1. 验证参数
    if (!pickupCode) {
      return res.status(400).json({
        ok: false,
        message: '请提供取件码'
      });
    }

    // 2. 验证取件码是否存在
    const record = await getCustomerByPickupCode(pickupCode);
    if (!record) {
      return res.status(200).json({
        ok: false,
        message: '取件码无效'
      });
    }

    // 3. 组装监控数据
    const monitorData = {
      batteryLevel: batteryLevel ?? null,
      wifiConnected: wifiConnected ?? null,
      todayPublishCount: todayPublishCount ?? null,
      todayPlatforms: todayPlatforms ?? null,
      cycleDay: cycleDay ?? null,
      pendingVideos: pendingVideos ?? null,
      lastError: lastError ?? null,
      uptimeMinutes: uptimeMinutes ?? null,
      reportedAt: new Date().toISOString()
    };

    // 4. 更新设备信息（心跳写入）
    await upsertDevice(pickupCode, {
      deviceId: deviceId || null,
      deviceModel: deviceModel || null,
      appVersion: appVersion || null,
      osVersion: osVersion || null,
      lastPublishTime: lastPublishTime || null,
      deviceStatus: 'online',
      configSnapshot: configSnapshot || null,
      monitorData
    });

    // 5. 拉取待执行指令
    let commands = [];
    try {
      const rows = await fetchAndMarkCommands(pickupCode);
      commands = rows.map(r => ({
        id: r.id,
        type: r.command_type,
        payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : (r.payload || {})
      }));
    } catch (cmdErr) {
      console.error('Fetch commands error (non-fatal):', cmdErr);
    }

    // 6. 返回成功响应
    return res.status(200).json({
      ok: true,
      serverTime: new Date().toISOString(),
      commands
    });

  } catch (error) {
    console.error('Heartbeat Error:', error);
    return res.status(500).json({
      ok: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

