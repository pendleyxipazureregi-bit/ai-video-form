import { sql } from '@vercel/postgres';
import { registerDeviceToken, verifyDeviceToken, checkAndInsertRequestId, checkDeviceRateLimit, saveErrorReport, getErrorReports, cleanupRateLimits } from '../_lib/db.js';
import { verifyAdmin } from '../_lib/auth.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id, X-Request-Id');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { action } = req.query;

    switch (action) {
        case 'register':
            return handleRegister(req, res);
        case 'report':
            return handleReport(req, res);
        case 'reports':
            return handleReports(req, res);
        case 'migrate':
            return handleMigrate(req, res);
        default:
            return res.status(404).json({ ok: false, message: '未知操作: ' + action });
    }
}

// ---- POST /api/device/register ----
async function handleRegister(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, message: '方法不允许' });

    try {
        const { deviceId, deviceInfo } = req.body || {};
        if (!deviceId) {
            return res.status(400).json({ ok: false, message: '缺少 deviceId' });
        }
        const token = await registerDeviceToken(deviceId, deviceInfo || {});
        return res.status(200).json({ token, expiresIn: '365d' });
    } catch (error) {
        console.error('Device Register Error:', error);
        return res.status(500).json({ ok: false, message: '服务器错误' });
    }
}

// ---- POST /api/device/report ----
async function handleReport(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, message: '方法不允许' });

    try {
        const authHeader = req.headers['authorization'] || '';
        const headerDeviceId = req.headers['x-device-id'] || '';
        const requestId = req.headers['x-request-id'] || '';

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ ok: false, message: '未提供认证 Token' });
        }
        const token = authHeader.slice(7);

        const tokenDeviceId = await verifyDeviceToken(token);
        if (!tokenDeviceId) {
            return res.status(401).json({ ok: false, message: 'Token 无效或已过期' });
        }

        if (headerDeviceId && headerDeviceId !== tokenDeviceId) {
            return res.status(403).json({ ok: false, message: '设备ID不匹配' });
        }

        if (!requestId) {
            return res.status(400).json({ ok: false, message: '缺少 X-Request-Id' });
        }
        const isNew = await checkAndInsertRequestId(requestId, tokenDeviceId);
        if (!isNew) {
            return res.status(409).json({ ok: false, message: '重复请求' });
        }

        const withinLimit = await checkDeviceRateLimit(tokenDeviceId);
        if (!withinLimit) {
            return res.status(429).json({ ok: false, message: '请求过于频繁' });
        }

        const body = req.body || {};
        if (body.timestamp) {
            const diff = Math.abs(Date.now() - Number(body.timestamp));
            if (diff > 5 * 60 * 1000) {
                return res.status(400).json({ ok: false, message: '时间戳过期' });
            }
        }

        if (body.screenshot) {
            const sizeBytes = Buffer.byteLength(body.screenshot, 'base64');
            if (sizeBytes > 200 * 1024) {
                return res.status(400).json({ ok: false, message: '截图超过 200KB' });
            }
        }

        await saveErrorReport({
            requestId,
            platform: body.platform,
            step: body.step,
            errorMsg: body.errorMsg,
            screenshot: body.screenshot || null,
            screenshotOmitted: body.screenshotOmitted || false,
            state: body.state,
            aiAction: body.aiAction,
            aiResult: body.aiResult,
            extra: body.extra || {}
        });

        if (Math.random() < 0.01) {
            cleanupRateLimits().catch(() => {});
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error Report Error:', error);
        return res.status(500).json({ ok: false, message: '服务器错误' });
    }
}

// ---- GET /api/device/reports（管理后台，需管理员认证） ----
async function handleReports(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ ok: false, message: '方法不允许' });

    const authResult = verifyAdmin(req);
    if (!authResult.valid) {
        return res.status(401).json({ ok: false, message: authResult.error });
    }

    try {
        const { deviceId, platform, page, limit } = req.query || {};
        const result = await getErrorReports({
            deviceId: deviceId || null,
            platform: platform || null,
            page: parseInt(page) || 1,
            limit: Math.min(parseInt(limit) || 20, 100)
        });
        return res.status(200).json({ ok: true, ...result });
    } catch (error) {
        console.error('Get Reports Error:', error);
        return res.status(500).json({ ok: false, message: '服务器错误' });
    }
}

// ---- POST /api/device/migrate（一次性数据库迁移，需管理员认证）----
// ⚠️ 迁移完成后请删除此 action
async function handleMigrate(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ ok: false, message: '方法不允许' });

    const authResult = verifyAdmin(req);
    if (!authResult.valid) {
        return res.status(401).json({ ok: false, message: authResult.error });
    }

    const results = [];

    try {
        // 1. 设备 Token 表
        await sql`
            CREATE TABLE IF NOT EXISTS device_tokens (
                id SERIAL PRIMARY KEY,
                device_id VARCHAR(128) UNIQUE NOT NULL,
                token VARCHAR(128) NOT NULL,
                device_brand VARCHAR(64),
                device_model VARCHAR(64),
                sdk_int INTEGER,
                screen_width INTEGER,
                screen_height INTEGER,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '365 days'
            );
        `;
        results.push('✅ device_tokens table created');

        await sql`CREATE INDEX IF NOT EXISTS idx_device_tokens_device_id ON device_tokens (device_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens (token);`;
        results.push('✅ device_tokens indexes created');

        // 2. 错误报告表
        await sql`
            CREATE TABLE IF NOT EXISTS error_reports (
                id SERIAL PRIMARY KEY,
                request_id VARCHAR(64) UNIQUE NOT NULL,
                device_id VARCHAR(128) NOT NULL,
                platform VARCHAR(30),
                step VARCHAR(200),
                error_msg TEXT,
                screenshot TEXT,
                screenshot_omitted BOOLEAN DEFAULT FALSE,
                state VARCHAR(50),
                ai_action VARCHAR(50),
                ai_result TEXT,
                extra JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;
        results.push('✅ error_reports table created');

        await sql`CREATE INDEX IF NOT EXISTS idx_error_reports_device ON error_reports (device_id);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_error_reports_created ON error_reports (created_at DESC);`;
        results.push('✅ error_reports indexes created');

        // 3. 设备限流计数表
        await sql`
            CREATE TABLE IF NOT EXISTS device_rate_limits (
                device_id VARCHAR(128) NOT NULL,
                hour_key VARCHAR(20) NOT NULL,
                count INTEGER DEFAULT 1,
                PRIMARY KEY (device_id, hour_key)
            );
        `;
        results.push('✅ device_rate_limits table created');

        // 4. 远程配置表
        await sql`
            CREATE TABLE IF NOT EXISTS device_configs (
                id SERIAL PRIMARY KEY,
                config_version INTEGER NOT NULL DEFAULT 1,
                config_body JSONB NOT NULL,
                signature TEXT NOT NULL,
                last_updated TIMESTAMPTZ DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE
            );
        `;
        results.push('✅ device_configs table created');

        return res.status(200).json({ ok: true, message: '数据库迁移完成', results });
    } catch (error) {
        console.error('Migration Error:', error);
        return res.status(500).json({ ok: false, message: '迁移失败: ' + error.message, results });
    }
}

