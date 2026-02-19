import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Plus, Loader2, Users, X, ChevronRight, Copy, Check,
} from 'lucide-react'
import { adminFetch, formatDate, daysUntil } from '../utils/api'

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'active', label: '正常' },
  { key: 'expired', label: '已过期' },
  { key: 'suspended', label: '已暂停' },
]

const PLAN_OPTIONS = [
  { value: 'trial', label: '试用' },
  { value: 'basic', label: '基础' },
  { value: 'pro', label: '专业' },
  { value: 'enterprise', label: '企业' },
]

function getStatusBadge(customer) {
  if (customer.status === 'suspended') {
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">已暂停</span>
  }
  const days = daysUntil(customer.end_date)
  if (days != null && days < 0) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600">已过期</span>
  }
  if (days != null && days <= 7) {
    return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600">即将到期</span>
  }
  return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">正常</span>
}

function planLabel(plan) {
  const map = { trial: '试用', basic: '基础', pro: '专业', enterprise: '企业' }
  return map[plan] || plan
}

/* =========================================
   新建客户弹窗
   ========================================= */
function CreateCustomerModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    customerName: '',
    contact: '',
    plan: 'basic',
    maxDevices: 10,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    codeCount: 0,
    codePrefix: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(-1)

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customerName.trim()) return
    if (!form.endDate) return
    setLoading(true)
    try {
      const body = {
        customerName: form.customerName,
        contact: form.contact,
        plan: form.plan,
        maxDevices: Number(form.maxDevices),
        startDate: form.startDate,
        endDate: form.endDate,
        notes: form.notes,
      }
      if (Number(form.codeCount) > 0) {
        body.codeCount = Number(form.codeCount)
        body.codePrefix = form.codePrefix
      }
      const data = await adminFetch('/api/admin/customers', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (data.success) {
        if (data.codes && data.codes.length > 0) {
          setResult(data.codes)
        } else {
          onSuccess()
          onClose()
        }
      }
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (code, idx) => {
    navigator.clipboard.writeText(code)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(-1), 1500)
  }

  // 成功并生成了取件码的展示
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { onSuccess(); onClose() }}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-800 mb-1">客户创建成功</h3>
          <p className="text-sm text-gray-500 mb-4">已生成 {result.length} 个取件码：</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {result.map((code, idx) => (
              <div key={code} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                <code className="font-mono text-sm text-gray-800">{code}</code>
                <button
                  onClick={() => handleCopy(code, idx)}
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                >
                  {copiedIdx === idx ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => { onSuccess(); onClose() }}
            className="w-full mt-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium transition-all"
          >
            完成
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800">新建客户</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 客户名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">客户名称 <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.customerName}
              onChange={(e) => update('customerName', e.target.value)}
              required
              placeholder="请输入客户名称"
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
            />
          </div>

          {/* 联系方式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">联系方式</label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => update('contact', e.target.value)}
              placeholder="手机号或微信号"
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
            />
          </div>

          {/* 套餐 + 最大设备数 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">套餐</label>
              <select
                value={form.plan}
                onChange={(e) => update('plan', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">最大设备数</label>
              <input
                type="number"
                value={form.maxDevices}
                onChange={(e) => update('maxDevices', e.target.value)}
                min="1"
                className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
              />
            </div>
          </div>

          {/* 开始日期 + 结束日期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">开始日期</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">结束日期 <span className="text-rose-500">*</span></label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => update('endDate', e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
              />
            </div>
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={2}
              placeholder="可选备注信息"
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300 resize-none"
            />
          </div>

          {/* 取件码 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">取件码数量</label>
              <input
                type="number"
                value={form.codeCount}
                onChange={(e) => update('codeCount', e.target.value)}
                min="0"
                className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
              />
            </div>
            {Number(form.codeCount) > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">取件码前缀</label>
                <input
                  type="text"
                  value={form.codePrefix}
                  onChange={(e) => update('codePrefix', e.target.value)}
                  placeholder="如: ALJ"
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
                />
              </div>
            )}
          </div>

          {/* 提交按钮 */}
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              创建客户
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================
   客户列表主组件
   ========================================= */
function CustomerList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchText, setSearchText] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const searchTimer = useRef(null)

  const fetchCustomers = useCallback(async (status, search) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      const qs = params.toString()
      const data = await adminFetch(`/api/admin/customers${qs ? '?' + qs : ''}`)
      if (data.success) setCustomers(data.customers || [])
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers(statusFilter, searchText)
  }, [statusFilter, fetchCustomers])

  // 搜索防抖
  const handleSearch = (val) => {
    setSearchText(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      fetchCustomers(statusFilter, val)
    }, 500)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">客户管理</h1>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* 搜索框 */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="搜索客户名或联系方式..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
          />
        </div>

        {/* 状态筛选 */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === tab.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 新建按钮 */}
        <button
          onClick={() => setShowCreate(true)}
          className="ml-auto px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          新建客户
        </button>
      </div>

      {/* 内容区 */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <Users className="w-10 h-10 mb-2" />
          <p className="text-sm">暂无客户数据</p>
        </div>
      ) : (
        <>
          {/* 桌面端表格 */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">客户名</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">套餐</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">到期时间</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">设备</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr
                    key={c.customer_id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/customers/${c.customer_id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-800">{c.customer_name}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {planLabel(c.plan)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(c.end_date)}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <span className="text-emerald-600 font-medium">{c.online_count ?? 0}</span>
                      <span className="text-gray-400"> / {c.device_count ?? 0}</span>
                    </td>
                    <td className="px-4 py-4">{getStatusBadge(c)}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-0.5 ml-auto">
                        详情 <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端卡片列表 */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <div
                key={c.customer_id}
                onClick={() => navigate(`/admin/customers/${c.customer_id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-800">{c.customer_name}</span>
                  {getStatusBadge(c)}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                    {planLabel(c.plan)}
                  </span>
                  <span>到期 {formatDate(c.end_date)}</span>
                  <span className="ml-auto">
                    设备 <span className="text-emerald-600 font-medium">{c.online_count ?? 0}</span>/{c.device_count ?? 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 新建客户弹窗 */}
      {showCreate && (
        <CreateCustomerModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => fetchCustomers(statusFilter, searchText)}
        />
      )}
    </div>
  )
}

export default CustomerList

