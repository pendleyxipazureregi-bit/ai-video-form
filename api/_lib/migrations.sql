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

