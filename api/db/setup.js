import { sql } from '@vercel/postgres';

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
      success: false,
      message: '请求方法不允许'
    });
  }

  // 密码保护
  const { secret, seed } = req.body || {};
  if (secret !== 'setup_ofai_2026') {
    return res.status(403).json({
      success: false,
      message: '未授权：密码错误'
    });
  }

  try {
    // 1. 创建 customers 表（客户维度）
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id SERIAL PRIMARY KEY,
        customer_name VARCHAR(100) NOT NULL,
        contact VARCHAR(200),
        plan VARCHAR(20) NOT NULL DEFAULT 'trial',
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        max_devices INTEGER DEFAULT 10,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 2. 创建 pickup_codes 表（取件码/设备维度，外键引用 customers）
    await sql`
      CREATE TABLE IF NOT EXISTS pickup_codes (
        pickup_code VARCHAR(50) PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(customer_id),
        device_id VARCHAR(100),
        device_model VARCHAR(100),
        device_alias VARCHAR(50),
        app_version VARCHAR(20),
        os_version VARCHAR(50),
        last_heartbeat TIMESTAMP WITH TIME ZONE,
        last_publish_time TIMESTAMP WITH TIME ZONE,
        device_status VARCHAR(20) DEFAULT 'offline',
        config_snapshot JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 3. 创建 admin_logs 表（操作日志）
    await sql`
      CREATE TABLE IF NOT EXISTS admin_logs (
        log_id SERIAL PRIMARY KEY,
        admin_id VARCHAR(50),
        action VARCHAR(50) NOT NULL,
        target_type VARCHAR(20),
        target_id VARCHAR(100),
        detail JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 4. 可选：插入种子数据
    let seeded = false;
    if (seed === true) {
      // 插入第一个客户（如果不存在）
      await sql`
        INSERT INTO customers (customer_name, contact, plan, start_date, end_date, status, max_devices, notes)
        VALUES ('爱旅居爱生活糖糖', '', 'trial', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'active', 10, '首批测试客户')
        ON CONFLICT DO NOTHING;
      `;

      // 插入取件码 65657（如果不存在），关联到上面的客户
      await sql`
        INSERT INTO pickup_codes (pickup_code, customer_id, is_active)
        VALUES ('65657', (SELECT customer_id FROM customers WHERE customer_name = '爱旅居爱生活糖糖' LIMIT 1), true)
        ON CONFLICT (pickup_code) DO NOTHING;
      `;

      seeded = true;
    }

    return res.status(200).json({
      success: true,
      message: 'Tables created',
      tables: ['customers', 'pickup_codes', 'admin_logs'],
      seeded
    });

  } catch (error) {
    console.error('Setup DB Error:', error);
    return res.status(500).json({
      success: false,
      message: '建表失败',
      error: error.message
    });
  }
}

