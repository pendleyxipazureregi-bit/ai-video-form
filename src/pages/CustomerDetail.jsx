import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Edit3, Save, X, Calendar, Pause, Play,
  Plus, Copy, Check, ToggleLeft, ToggleRight, Pencil, FileText, ExternalLink,
} from 'lucide-react'
import { adminFetch, formatDate, timeAgo, daysUntil } from '../utils/api'

const PLAN_OPTIONS = [
  { value: 'trial', label: '试用' },
  { value: 'basic', label: '基础' },
  { value: 'pro', label: '专业' },
  { value: 'enterprise', label: '企业' },
]

function planLabel(plan) {
  const map = { trial: '试用', basic: '基础', pro: '专业', enterprise: '企业' }
  return map[plan] || plan
}

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

/* =========================================
   续费弹窗
   ========================================= */
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
      // handled
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-1">续费</h3>
        <p className="text-sm text-gray-500 mb-5">当前到期：{formatDate(customer.end_date)}</p>
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
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors">
              取消
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              确认续费
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================
   追加取件码弹窗
   ========================================= */
function AddCodesModal({ customerId, onClose, onSuccess }) {
  const [count, setCount] = useState(1)
  const [prefix, setPrefix] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copiedIdx, setCopiedIdx] = useState(-1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (count < 1) return
    setLoading(true)
    try {
      const data = await adminFetch(`/api/admin/codes?customerId=${customerId}`, {
        method: 'POST',
        body: JSON.stringify({ count: Number(count), prefix }),
      })
      if (data.success) {
        setResult(data.codes)
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

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { onSuccess(); onClose() }}>
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-800 mb-1">取件码生成成功</h3>
          <p className="text-sm text-gray-500 mb-4">已生成 {result.length} 个取件码：</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {result.map((code, idx) => (
              <div key={code} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                <code className="font-mono text-sm text-gray-800">{code}</code>
                <button onClick={() => handleCopy(code, idx)} className="text-gray-400 hover:text-primary-600 transition-colors">
                  {copiedIdx === idx ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => { onSuccess(); onClose() }} className="w-full mt-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium transition-all">
            完成
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 mb-5">追加取件码</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">数量</label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              min="1"
              required
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">前缀</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="如: ALJ"
              className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors">
              取消
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              生成
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* =========================================
   导出取件码弹窗
   ========================================= */
function ExportCodesModal({ customer, devices, onClose }) {
  const [copied, setCopied] = useState(false)

  const isOnline = (lastHeartbeat) => {
    if (!lastHeartbeat) return false
    return Date.now() - new Date(lastHeartbeat).getTime() < 24 * 60 * 60 * 1000
  }

  const textContent = [
    `客户: ${customer.customer_name}`,
    `套餐: ${planLabel(customer.plan)}`,
    `到期: ${formatDate(customer.end_date)}`,
    `导出时间: ${new Date().toLocaleString('zh-CN')}`,
    `${'─'.repeat(40)}`,
    ...devices.map((d, i) => {
      const status = d.is_active ? '启用' : '停用'
      const online = d.device_id ? (isOnline(d.last_heartbeat) ? '在线' : '离线') : '未绑定'
      const alias = d.device_alias || d.device_model || ''
      return `${i + 1}. ${d.pickup_code}  |  ${status}  |  ${online}${alias ? '  |  ' + alias : ''}`
    }),
  ].join('\n')

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = textContent
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">导出取件码</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <pre className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 font-mono whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed border border-gray-200">
          {textContent}
        </pre>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors">
            关闭
          </button>
          <button
            onClick={handleCopyAll}
            className={`flex-1 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
              copied
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white'
            }`}
          >
            {copied ? <><Check className="w-4 h-4" /> 已复制</> : <><Copy className="w-4 h-4" /> 一键复制</>}
          </button>
        </div>
      </div>
    </div>
  )
}

/* =========================================
   可编辑设备别名
   ========================================= */
function EditableAlias({ code, alias, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(alias || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (value === (alias || '')) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      const data = await adminFetch(`/api/admin/codes?code=${encodeURIComponent(code)}`, {
        method: 'PUT',
        body: JSON.stringify({ deviceAlias: value }),
      })
      if (data.success) onSaved()
    } catch {
      // handled
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          autoFocus
          className="px-2 py-1 bg-gray-50 border border-gray-300 rounded-lg text-sm w-28 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
        />
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-1 text-sm text-gray-700 hover:text-primary-600 transition-colors group"
    >
      <span>{alias || '未命名'}</span>
      <Pencil className="w-3 h-3 text-gray-400 group-hover:text-primary-500 transition-colors" />
    </button>
  )
}

/* =========================================
   客户详情主组件
   ========================================= */
function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [showRenew, setShowRenew] = useState(false)
  const [showAddCodes, setShowAddCodes] = useState(false)
  const [showExportCodes, setShowExportCodes] = useState(false)
  const [togglingCode, setTogglingCode] = useState(null)

  const fetchDetail = useCallback(async () => {
    try {
      const data = await adminFetch(`/api/admin/customer?id=${id}`)
      if (data.success) {
        setCustomer(data.customer)
        setDevices(data.devices || [])
      }
    } catch {
      // handled
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  const startEdit = () => {
    setEditForm({
      customerName: customer.customer_name || '',
      contact: customer.contact || '',
      plan: customer.plan || 'basic',
      maxDevices: customer.max_devices ?? 10,
      endDate: customer.end_date ? customer.end_date.split('T')[0] : '',
      status: customer.status || 'active',
      notes: customer.notes || '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const data = await adminFetch(`/api/admin/customer?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      if (data.success) {
        setEditing(false)
        fetchDetail()
      }
    } catch {
      // handled
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async () => {
    const newStatus = customer.status === 'suspended' ? 'active' : 'suspended'
    try {
      const data = await adminFetch(`/api/admin/customer?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      if (data.success) fetchDetail()
    } catch {
      // handled
    }
  }

  const toggleCodeActive = async (code, currentActive) => {
    setTogglingCode(code)
    try {
      const data = await adminFetch(`/api/admin/codes?code=${encodeURIComponent(code)}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (data.success) fetchDetail()
    } catch {
      // handled
    } finally {
      setTogglingCode(null)
    }
  }

  const isOnline = (lastHeartbeat) => {
    if (!lastHeartbeat) return false
    return Date.now() - new Date(lastHeartbeat).getTime() < 24 * 60 * 60 * 1000
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>客户不存在或加载失败</p>
        <button onClick={() => navigate('/admin/customers')} className="mt-2 text-primary-600 hover:underline text-sm">
          返回客户列表
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/admin/customers')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回客户列表
      </button>

      {/* 客户信息卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">
              {editing ? '编辑客户信息' : customer.customer_name}
            </h2>
            {!editing && getStatusBadge(customer)}
          </div>
          {!editing && (
            <button
              onClick={startEdit}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              编辑
            </button>
          )}
        </div>

        {editing ? (
          /* 编辑模式 */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">客户名称</label>
                <input
                  type="text"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">联系方式</label>
                <input
                  type="text"
                  value={editForm.contact}
                  onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">套餐</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
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
                  value={editForm.maxDevices}
                  onChange={(e) => setEditForm({ ...editForm, maxDevices: e.target.value })}
                  min="1"
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">到期时间</label>
                <input
                  type="date"
                  value={editForm.endDate}
                  onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">状态</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300"
                >
                  <option value="active">正常</option>
                  <option value="suspended">已暂停</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">备注</label>
              <textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 focus:bg-white focus:border-primary-500 transition-all duration-300 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存
              </button>
            </div>
          </div>
        ) : (
          /* 展示模式 */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
            <InfoItem label="客户名称" value={customer.customer_name} />
            <InfoItem label="联系方式" value={customer.contact || '-'} />
            <InfoItem label="套餐" value={planLabel(customer.plan)} />
            <InfoItem label="最大设备数" value={customer.max_devices} />
            <InfoItem label="开始日期" value={formatDate(customer.start_date)} />
            <InfoItem label="到期日期" value={formatDate(customer.end_date)} />
            <InfoItem label="创建时间" value={formatDate(customer.created_at)} />
            {customer.notes && <InfoItem label="备注" value={customer.notes} className="sm:col-span-2" />}
          </div>
        )}
      </div>

      {/* 快捷操作 */}
      {!editing && (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowRenew(true)}
            className="px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            续费
          </button>
          <button
            onClick={toggleStatus}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              customer.status === 'suspended'
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
            }`}
          >
            {customer.status === 'suspended' ? (
              <><Play className="w-4 h-4" /> 恢复服务</>
            ) : (
              <><Pause className="w-4 h-4" /> 暂停服务</>
            )}
          </button>
          {devices.length > 0 && (
            <button
              onClick={() => setShowExportCodes(true)}
              className="px-4 py-2.5 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              导出取件码
            </button>
          )}
        </div>
      )}

      {/* 取件码与设备列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">取件码与设备</h2>
          <button
            onClick={() => setShowAddCodes(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            追加取件码
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            暂无取件码
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {devices.map((d) => {
              const online = isOnline(d.last_heartbeat)
              const hasBound = !!d.device_id
              return (
                <div key={d.pickup_code} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* 取件码 */}
                    <code className="font-mono text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg flex-shrink-0">
                      {d.pickup_code}
                    </code>

                    {/* 设备信息 */}
                    <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
                      {/* 在线状态 */}
                      {hasBound && (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${online ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                          <span className={online ? 'text-emerald-600' : 'text-gray-400'}>
                            {online ? '在线' : timeAgo(d.last_heartbeat)}
                          </span>
                        </span>
                      )}

                      {/* 别名（可编辑） */}
                      {hasBound && (
                        <EditableAlias
                          code={d.pickup_code}
                          alias={d.device_alias}
                          onSaved={fetchDetail}
                        />
                      )}

                      {/* 设备型号 */}
                      {d.device_model && (
                        <span className="text-xs text-gray-400">{d.device_model}</span>
                      )}

                      {/* 未绑定 */}
                      {!hasBound && (
                        <span className="text-sm text-gray-400 italic">未绑定设备</span>
                      )}
                    </div>

                    {/* 查看详情链接 */}
                    {hasBound && (
                      <Link
                        to={`/admin/devices/${encodeURIComponent(d.pickup_code)}`}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium flex-shrink-0 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">详情</span>
                      </Link>
                    )}

                    {/* 启用/停用开关 */}
                    <button
                      onClick={() => toggleCodeActive(d.pickup_code, d.is_active)}
                      disabled={togglingCode === d.pickup_code}
                      className={`flex items-center gap-1.5 text-sm font-medium flex-shrink-0 transition-colors ${
                        d.is_active ? 'text-emerald-600 hover:text-emerald-700' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {togglingCode === d.pickup_code ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : d.is_active ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                      <span className="hidden sm:inline">{d.is_active ? '已启用' : '已停用'}</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 续费弹窗 */}
      {showRenew && (
        <RenewModal
          customer={customer}
          onClose={() => setShowRenew(false)}
          onSuccess={fetchDetail}
        />
      )}

      {/* 追加取件码弹窗 */}
      {showAddCodes && (
        <AddCodesModal
          customerId={id}
          onClose={() => setShowAddCodes(false)}
          onSuccess={fetchDetail}
        />
      )}

      {/* 导出取件码弹窗 */}
      {showExportCodes && (
        <ExportCodesModal
          customer={customer}
          devices={devices}
          onClose={() => setShowExportCodes(false)}
        />
      )}
    </div>
  )
}

/* =========================================
   信息展示项
   ========================================= */
function InfoItem({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  )
}

export default CustomerDetail

