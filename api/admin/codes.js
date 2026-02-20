// Vercel Serverless Function - 取件码管理 API
//
// GET:   获取单个设备/取件码详情
// POST:  为客户追加生成取件码
// PUT:   修改取件码（停用/启用/设置别名）
// PATCH: 发送设备指令

import { verifyAdmin } from '../_lib/auth.js';
import { generatePickupCodes, logAdminAction, updatePickupCode, getDeviceDetail, createDeviceCommand, getDeviceCommandHistory } from '../_lib/db.js';

export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // 处理 OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // JWT 认证
  const auth = verifyAdmin(req);
  if (!auth.valid) {
    return res.status(401).json({
      success: false,
      message: auth.error
    });
  }

  try {
    // ==================== GET: 获取单个设备/取件码详情 ====================
    if (req.method === 'GET') {
      const { code } = req.query || {};

      if (!code) {
        return res.status(400).json({
          success: false,
          message: '缺少 code 参数'
        });
      }

      const detail = await getDeviceDetail(code);

      if (!detail) {
        return res.status(404).json({
          success: false,
          message: '取件码不存在'
        });
      }

      // 解析 JSON 字段
      let monitorData = null;
      if (detail.monitor_data) {
        try {
          monitorData = typeof detail.monitor_data === 'string'
            ? JSON.parse(detail.monitor_data)
            : detail.monitor_data;
        } catch { monitorData = null; }
      }

      let configSnapshot = null;
      if (detail.config_snapshot) {
        try {
          configSnapshot = typeof detail.config_snapshot === 'string'
            ? JSON.parse(detail.config_snapshot)
            : detail.config_snapshot;
        } catch { configSnapshot = null; }
      }

      return res.status(200).json({
        success: true,
        device: {
          pickupCode: detail.pickup_code,
          deviceId: detail.device_id,
          deviceAlias: detail.device_alias,
          deviceModel: detail.device_model,
          appVersion: detail.app_version,
          osVersion: detail.os_version,
          deviceStatus: detail.device_status,
          lastHeartbeat: detail.last_heartbeat,
          lastPublishTime: detail.last_publish_time,
          isActive: detail.is_active,
          configSnapshot,
          monitorData,
          codeCreatedAt: detail.code_created_at,
          accountName: detail.account_name,
          // 关联客户信息
          customerId: detail.customer_id,
          customerName: detail.customer_name,
          plan: detail.plan,
          endDate: detail.end_date,
          customerStatus: detail.customer_status
        }
      });
    }

    // ==================== POST: 为客户追加生成取件码 ====================
    if (req.method === 'POST') {
      const { customerId } = req.query || {};
      const { count, prefix } = req.body || {};

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: '缺少 customerId 参数'
        });
      }

      if (!count || count < 1) {
        return res.status(400).json({
          success: false,
          message: '缺少 count 参数或数量不合法'
        });
      }

      const codes = await generatePickupCodes(
        parseInt(customerId),
        parseInt(count),
        prefix || 'CODE'
      );

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'generate_codes',
        'customer',
        String(customerId),
        { count: parseInt(count), prefix: prefix || 'CODE', codes }
      );

      return res.status(200).json({
        success: true,
        codes
      });
    }

    // ==================== PUT: 修改取件码 ====================
    if (req.method === 'PUT') {
      const { code } = req.query || {};
      const { isActive, deviceAlias, accountName } = req.body || {};

      if (!code) {
        return res.status(400).json({
          success: false,
          message: '缺少 code 参数'
        });
      }

      const pickupCode = await updatePickupCode(code, { isActive, deviceAlias, accountName });

      if (!pickupCode) {
        return res.status(404).json({
          success: false,
          message: '取件码不存在'
        });
      }

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'update_code',
        'pickup_code',
        code,
        { isActive, deviceAlias, accountName }
      );

      return res.status(200).json({
        success: true,
        pickupCode
      });
    }

    // ==================== PATCH: 设备指令 ====================
    if (req.method === 'PATCH') {
      const { code, action } = req.query || {};

      if (!code) {
        return res.status(400).json({
          success: false,
          message: '缺少 code 参数'
        });
      }

      // action=history → 查询指令历史
      if (action === 'history') {
        const limit = parseInt(req.query.limit) || 20;
        const history = await getDeviceCommandHistory(code, limit);
        return res.status(200).json({ success: true, commands: history });
      }

      // 否则为发送指令
      const { commandType, payload } = req.body || {};

      if (!commandType) {
        return res.status(400).json({
          success: false,
          message: '缺少 commandType 参数'
        });
      }

      const allowedTypes = ['message', 'reboot', 'update_config', 'force_publish', 'clear_cache'];
      if (!allowedTypes.includes(commandType)) {
        return res.status(400).json({
          success: false,
          message: `不支持的指令类型: ${commandType}，允许: ${allowedTypes.join(', ')}`
        });
      }

      const command = await createDeviceCommand(code, commandType, payload || {});

      // 记录操作日志
      await logAdminAction(
        auth.admin.id,
        'send_command',
        'pickup_code',
        code,
        { commandType, payload, commandId: command.id }
      );

      return res.status(200).json({
        success: true,
        command
      });
    }

    // 其他方法不允许
    return res.status(405).json({
      success: false,
      message: '请求方法不允许'
    });

  } catch (error) {
    console.error('Codes API Error:', error);
    return res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
}

