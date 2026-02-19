import { useState, useEffect, useCallback } from 'react'
import { Users, Monitor, Clock, WifiOff, Loader2, RefreshCw, CalendarCheck } from 'lucide-react'
import { adminFetch, formatDate, timeAgo, daysUntil } from '../utils/api'

function StatCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-rose-50 text-rose-600',
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function RenewModal({ customer, onClose, onSuccess }) {
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!endDate) return
    setLoading(true)
    try {
      const data = await adminFetch(`/api/admin/customer?id=${customer.customer_id}`, {
        method: 'PUT',
        body: JSON.stringify({ endDate }),
      })
      if (data.success) {
        onSuccess()
        onClose()
      }
    } catch {
      // adminFetch 已处理 401
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-1">续费 — {customer.customer_name}</h3>
        <p className="text-sm text-gray-500 mb-5">
          当前到期：{formatDate(customer.end_date)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">新到期日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              确认续费
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [renewTarget, setRenewTarget] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/dashboard')
      if (res.success) setData(res)
    } catch {
      // adminFetch 已处理 401
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 60000)
    return () => clearInterval(timer)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>加载失败</p>
        <button onClick={fetchData} className="mt-2 text-primary-600 hover:underline text-sm">
          重试
        </button>
      </div>
    )
  }

  const planLabel = (plan) => {
    const map = { trial: '试用', basic: '基础', pro: '专业', enterprise: '企业' }
    return map[plan] || plan
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">运营仪表盘</h1>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="总客户数" value={data.totalCustomers} color="blue" />
        <StatCard
          icon={Monitor}
          label="活跃设备 / 总设备"
          value={`${data.onlineDevices} / ${data.totalDevices}`}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="即将到期"
          value={data.expiringCustomers?.length || 0}
          color="orange"
        />
        <StatCard
          icon={WifiOff}
          label="离线设备"
          value={data.offlineDevices?.length || 0}
          color="red"
        />
      </div>

      {/* 即将到期客户 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            即将到期客户
          </h2>
          <span className="text-sm text-gray-400">
            {data.expiringCustomers?.length || 0} 个
          </span>
        </div>
        {data.expiringCustomers?.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {data.expiringCustomers.map((c) => {
              const days = daysUntil(c.end_date)
              return (
                <div
                  key={c.customer_id}
                  className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="font-medium text-gray-800 truncate">{c.customer_name}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {planLabel(c.plan)}
                    </span>
                    <span className="text-sm text-gray-500 hidden sm:inline">{formatDate(c.end_date)}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
                      {days != null && days >= 0 ? `${days}天后到期` : '已到期'}
                    </span>
                  </div>
                  <button
                    onClick={() => setRenewTarget(c)}
                    className="ml-3 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                  >
                    续费
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            暂无即将到期的客户
          </div>
        )}
      </div>

      {/* 已过期客户 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-rose-500" />
            已过期客户
          </h2>
          <span className="text-sm text-gray-400">
            {data.expiredCustomers?.length || 0} 个
          </span>
        </div>
        {data.expiredCustomers?.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {data.expiredCustomers.map((c) => {
              const days = daysUntil(c.end_date)
              return (
                <div
                  key={c.customer_id}
                  className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <span className="font-medium text-gray-800 truncate">{c.customer_name}</span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {planLabel(c.plan)}
                    </span>
                    <span className="text-sm text-gray-500 hidden sm:inline">{formatDate(c.end_date)}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600">
                      已过期{days != null ? `${Math.abs(days)}天` : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => setRenewTarget(c)}
                    className="ml-3 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                  >
                    续费
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            暂无已过期的客户
          </div>
        )}
      </div>

      {/* 离线设备 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-rose-500" />
            离线设备
          </h2>
          <span className="text-sm text-gray-400">
            {data.offlineDevices?.length || 0} 台
          </span>
        </div>
        {data.offlineDevices?.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {data.offlineDevices.map((d, idx) => (
              <div
                key={d.pickup_code || idx}
                className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0 flex-wrap">
                  <span className="font-medium text-gray-800">
                    {d.device_alias || d.device_model || '未命名设备'}
                  </span>
                  <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
                    {d.pickup_code}
                  </code>
                  <span className="text-sm text-gray-500">{d.customer_name}</span>
                </div>
                <span className="text-sm text-gray-400 flex-shrink-0 ml-3">
                  {timeAgo(d.last_heartbeat)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-emerald-500 text-sm flex items-center justify-center gap-2">
            <Monitor className="w-5 h-5" />
            所有设备运行正常
          </div>
        )}
      </div>

      {/* 续费弹窗 */}
      {renewTarget && (
        <RenewModal
          customer={renewTarget}
          onClose={() => setRenewTarget(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}

export default Dashboard

