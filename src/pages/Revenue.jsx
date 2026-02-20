import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, TrendingUp, ShoppingCart, BarChart3,
  Loader2, RefreshCw, Plus, ChevronDown, ChevronUp,
  Check, X, Clock, CreditCard, ExternalLink
} from 'lucide-react'
import { adminFetch, formatDate, timeAgo } from '../utils/api'

/* 统计卡片 */
function StatCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* 订单状态徽标 */
function OrderStatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-600',
    paid: 'bg-emerald-50 text-emerald-600',
    failed: 'bg-rose-50 text-rose-600',
    refunded: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  const labels = {
    pending: '待支付',
    paid: '已支付',
    failed: '失败',
    refunded: '已退款',
    cancelled: '已取消',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}

/* 新建订单弹窗 */
function CreateOrderModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    customerId: '',
    pickupCode: '',
    plan: 'basic',
    durationDays: '30',
    amount: '',
    paymentChannel: 'manual',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) {
      setError('请输入金额')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await adminFetch('/api/admin/dashboard', {
        method: 'POST',
        body: JSON.stringify({
          customerId: form.customerId || undefined,
          pickupCode: form.pickupCode || undefined,
          plan: form.plan,
          durationDays: parseInt(form.durationDays) || 30,
          amount: parseFloat(form.amount),
          paymentChannel: form.paymentChannel,
        })
      })
      if (data.success) {
        onSuccess()
        onClose()
      } else {
        setError(data.message || '创建失败')
      }
    } catch (err) {
      setError(err.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-4">录入订单</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">客户ID</label>
              <input
                type="text"
                value={form.customerId}
                onChange={e => update('customerId', e.target.value)}
                placeholder="可选"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">取件码</label>
              <input
                type="text"
                value={form.pickupCode}
                onChange={e => update('pickupCode', e.target.value)}
                placeholder="可选"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">套餐 *</label>
              <select
                value={form.plan}
                onChange={e => update('plan', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="trial">试用</option>
                <option value="basic">基础</option>
                <option value="pro">专业</option>
                <option value="enterprise">企业</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">时长 (天)</label>
              <input
                type="number"
                value={form.durationDays}
                onChange={e => update('durationDays', e.target.value)}
                min="1"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">金额 (元) *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => update('amount', e.target.value)}
                required
                placeholder="0.00"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">支付渠道</label>
              <select
                value={form.paymentChannel}
                onChange={e => update('paymentChannel', e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="manual">手动录入</option>
                <option value="wechatpay">微信支付</option>
                <option value="alipay">支付宝</option>
                <option value="transfer">银行转账</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              创建订单
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* 主页面 */
function Revenue() {
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCreateOrder, setShowCreateOrder] = useState(false)

  const fetchRevenue = useCallback(async () => {
    try {
      const data = await adminFetch('/api/admin/dashboard?type=revenue')
      if (data.success) {
        setRevenue(data)
      }
    } catch {
      // handled by adminFetch
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  // 更新订单状态
  const updateOrder = async (orderId, status) => {
    try {
      const data = await adminFetch('/api/admin/dashboard', {
        method: 'PUT',
        body: JSON.stringify({ orderId, status })
      })
      if (data.success) {
        fetchRevenue()
      }
    } catch {
      // handled
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!revenue) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>加载失败</p>
        <button onClick={fetchRevenue} className="mt-2 text-primary-600 hover:underline text-sm">
          重试
        </button>
      </div>
    )
  }

  const planLabel = (plan) => {
    const map = { trial: '试用', basic: '基础', pro: '专业', enterprise: '企业' }
    return map[plan] || plan || '-'
  }

  const channelLabel = (ch) => {
    const map = { manual: '手动', wechatpay: '微信', alipay: '支付宝', transfer: '转账' }
    return map[ch] || ch || '-'
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">收入与订单</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRevenue}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          <button
            onClick={() => setShowCreateOrder(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            录入订单
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="总收入"
          value={`¥${(revenue.totalRevenue || 0).toLocaleString()}`}
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="本月收入"
          value={`¥${(revenue.monthRevenue || 0).toLocaleString()}`}
          color="blue"
        />
        <StatCard
          icon={ShoppingCart}
          label="本月订单"
          value={revenue.monthOrders || 0}
          color="violet"
        />
        <StatCard
          icon={BarChart3}
          label="平均客单价"
          value={revenue.monthOrders > 0 ? `¥${Math.round(revenue.monthRevenue / revenue.monthOrders)}` : '¥0'}
          color="orange"
        />
      </div>

      {/* 最近订单 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-500" />
            最近订单
          </h2>
          <span className="text-sm text-gray-400">
            最新 {revenue.recentOrders?.length || 0} 条
          </span>
        </div>

        {revenue.recentOrders?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="px-6 py-3 text-left font-medium">订单号</th>
                  <th className="px-4 py-3 text-left font-medium">客户</th>
                  <th className="px-4 py-3 text-left font-medium">套餐</th>
                  <th className="px-4 py-3 text-right font-medium">金额</th>
                  <th className="px-4 py-3 text-left font-medium">渠道</th>
                  <th className="px-4 py-3 text-left font-medium">状态</th>
                  <th className="px-4 py-3 text-left font-medium">时间</th>
                  <th className="px-6 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {revenue.recentOrders.map(order => (
                  <tr key={order.order_id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <code className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">
                        {order.order_id}
                      </code>
                    </td>
                    <td className="px-4 py-3.5">
                      {order.customer_name ? (
                        <Link
                          to={`/admin/customers/${order.customer_id}`}
                          className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium"
                        >
                          {order.customer_name}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {planLabel(order.plan)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-gray-800">¥{parseFloat(order.amount || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {channelLabel(order.payment_channel)}
                    </td>
                    <td className="px-4 py-3.5">
                      <OrderStatusBadge status={order.payment_status} />
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {timeAgo(order.created_at)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {order.payment_status === 'pending' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => updateOrder(order.order_id, 'paid')}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="标记已支付"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => updateOrder(order.order_id, 'cancelled')}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            title="取消订单"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {order.payment_status === 'paid' && (
                        <button
                          onClick={() => updateOrder(order.order_id, 'refunded')}
                          className="text-xs text-gray-400 hover:text-rose-500 transition-colors"
                        >
                          退款
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            暂无订单记录
          </div>
        )}
      </div>

      {/* 创建订单弹窗 */}
      {showCreateOrder && (
        <CreateOrderModal
          onClose={() => setShowCreateOrder(false)}
          onSuccess={fetchRevenue}
        />
      )}
    </div>
  )
}

export default Revenue

