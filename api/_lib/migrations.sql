-- ============================================================
-- Phase 3-4 数据库迁移脚本
-- 在 Vercel Postgres (Neon) 控制台中执行
-- ============================================================

-- Task 3b: 设备监控数据字段
ALTER TABLE pickup_codes ADD COLUMN IF NOT EXISTS monitor_data JSONB DEFAULT NULL;

-- Task 3d: 设备指令/通知队列表
CREATE TABLE IF NOT EXISTS device_commands (
  id            SERIAL PRIMARY KEY,
  pickup_code   VARCHAR(50) NOT NULL REFERENCES pickup_codes(pickup_code),
  command_type  VARCHAR(50) NOT NULL,          -- 'notification' | 'config_update' | 'restart' | 'custom'
  payload       JSONB DEFAULT '{}',            -- 指令内容
  status        VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'sent' | 'ack'
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  sent_at       TIMESTAMPTZ DEFAULT NULL,
  ack_at        TIMESTAMPTZ DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_device_commands_pending
  ON device_commands (pickup_code, status) WHERE status = 'pending';

-- Task 4b: 订单/支付表
CREATE TABLE IF NOT EXISTS orders (
  order_id        VARCHAR(64) PRIMARY KEY,       -- 业务订单号
  customer_id     INTEGER REFERENCES customers(customer_id),
  pickup_code     VARCHAR(50),
  plan            VARCHAR(20) NOT NULL,          -- 套餐类型
  duration_days   INTEGER NOT NULL DEFAULT 30,   -- 购买时长（天）
  amount          INTEGER NOT NULL DEFAULT 0,    -- 金额（分）
  payment_channel VARCHAR(30) DEFAULT NULL,      -- 'wechat' | 'alipay' | 'manual'
  payment_status  VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'paid' | 'failed' | 'refunded'
  trade_no        VARCHAR(128) DEFAULT NULL,     -- 第三方支付流水号
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  paid_at         TIMESTAMPTZ DEFAULT NULL,
  detail          JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders (payment_status);

-- account_name: 取件码对应的账号名称（小红书/抖音/快手/视频号共用）
ALTER TABLE pickup_codes ADD COLUMN IF NOT EXISTS account_name VARCHAR(100);

-- ============================================================
-- AI 错误上报系统迁移
-- ============================================================

-- 设备 Token 表
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
CREATE INDEX IF NOT EXISTS idx_device_tokens_device_id ON device_tokens (device_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens (token);

-- 错误报告表
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
CREATE INDEX IF NOT EXISTS idx_error_reports_device ON error_reports (device_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_created ON error_reports (created_at DESC);

-- 设备限流计数表（替代 Redis）
CREATE TABLE IF NOT EXISTS device_rate_limits (
    device_id VARCHAR(128) NOT NULL,
    hour_key VARCHAR(20) NOT NULL,
    count INTEGER DEFAULT 1,
    PRIMARY KEY (device_id, hour_key)
);

-- 远程配置表
CREATE TABLE IF NOT EXISTS device_configs (
    id SERIAL PRIMARY KEY,
    config_version INTEGER NOT NULL DEFAULT 1,
    config_body JSONB NOT NULL,
    signature TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

