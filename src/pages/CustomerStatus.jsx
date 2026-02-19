import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Monitor, Wifi, WifiOff, ArrowLeft, Shield, Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { formatDate, timeAgo, daysUntil } from '../utils/api'

const PLAN_MAP = { trial: '试用', basic: '基础', pro: '专业', enterprise: '企业' }

function planLabel(plan) {
  return PLAN_MAP[plan] || plan
}

function planColor(plan) {
  const map = {
    trial: 'bg-gray-100 text-gray-600',
    basic: 'bg-blue-50 text-blue-700',
    pro: 'bg-purple-50 text-purple-700',
    enterprise: 'bg-amber-50 text-amber-700',
  }
  return map[plan] || 'bg-gray-100 text-gray-600'
}

function getStatusInfo(status, endDate) {
  if (status === 'suspended') {
    return { label: '已暂停', cls: 'bg-gray-100 text-gray-600' }
  }
  const days = daysUntil(endDate)
  if (days != null && days < 0) {
    return { label: '已过期', cls: 'bg-rose-50 text-rose-600' }
  }
  if (days != null && days <= 7) {
    return { label: '即将到期', cls: 'bg-orange-50 text-orange-600' }
  }
  return { label: '正常', cls: 'bg-emerald-50 text-emerald-600' }
}

function CustomerStatus() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!code.trim()) {
      setError('请输入取件码')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/customer/status?code=${encodeURIComponent(code.trim())}`)
      const data = await res.json()
      if (data.success) {
        setResult(data)
      } else {
        setError(data.message || '未找到相关信息，请检查取件码是否正确')
      }
    } catch {
      setError('网络错误，请检查网络连接后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
    setCode('')
  }

  const handleRequery = () => {
    setResult(null)
    setError(null)
  }

  // ========== 结果界面 ==========
  if (result) {
    const statusInfo = getStatusInfo(result.status, result.endDate)
    const days = daysUntil(result.endDate)

    return (
      <div className="min-h-screen pb-safe">
        {/* 装饰背景 */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-20 w-60 h-60 bg-primary-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-amber-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-lg mx-auto px-4 py-6">
          {/* 客户信息卡片 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg shadow-gray-200/50 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-800 font-display truncate">
                  {result.customerName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${planColor(result.plan)}`}>
                    {planLabel(result.plan)}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.cls}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">服务期</span>
                <span className="text-gray-800 font-medium">
                  {formatDate(result.startDate)} → {formatDate(result.endDate)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-gray-500">剩余天数</span>
                <span className={`font-bold ${
                  days != null && days < 0 ? 'text-rose-600' :
                  days != null && days <= 7 ? 'text-orange-600' :
                  'text-emerald-600'
                }`}>
                  {days != null ? (days >= 0 ? `${days} 天` : `已过期 ${Math.abs(days)} 天`) : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-500">设备数量</span>
                <span className="text-gray-800 font-medium">{result.devices?.length || 0} 台</span>
              </div>
            </div>
          </div>

          {/* 设备列表 */}
          <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary-600" />
                设备状态
              </h3>
              <span className="text-sm text-gray-400">{result.devices?.length || 0} 台</span>
            </div>

            {result.devices && result.devices.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {result.devices.map((device, idx) => (
                  <div key={device.pickupCode || idx} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-gray-800">
                        {device.deviceAlias || device.pickupCode}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm">
                        {device.isOnline ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                            <span className="text-emerald-600">在线</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-gray-300 flex-shrink-0" />
                            <span className="text-gray-400">离线（{timeAgo(device.lastHeartbeat)}）</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {device.deviceModel && (
                        <span>{device.deviceModel}</span>
                      )}
                      <code className="bg-gray-50 px-1.5 py-0.5 rounded font-mono">
                        {device.pickupCode}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">
                暂无设备信息
              </div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="space-y-4">
            <button
              onClick={handleRequery}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white font-semibold rounded-2xl shadow-xl shadow-emerald-500/20 hover:shadow-2xl hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重新查询
            </button>
            <Link
              to="/"
              className="w-full block text-center text-gray-400 text-sm hover:text-gray-600 transition-colors"
            >
              返回首页
            </Link>
          </div>

          {/* Footer */}
          <footer className="text-center text-xs text-gray-400 pt-8 pb-4">
            <p>© 2025 津合智能 · AI赋能银发经济</p>
          </footer>
        </div>
      </div>
    )
  }

  // ========== 输入界面 ==========
  return (
    <div className="min-h-screen pb-safe">
      {/* 装饰背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-primary-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-amber-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <header className="mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回首页</span>
          </Link>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm mb-4">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-600 font-medium">服务状态查询</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-primary-600 to-primary-700 bg-clip-text text-transparent font-display mb-3">
              服务状态查询
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              输入取件码查看您的服务状态和设备信息
            </p>
          </div>
        </header>

        {/* 输入表单 */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Search className="w-4 h-4 text-emerald-500" />
              </div>
              <label className="text-sm font-semibold text-gray-700">
                取件码 <span className="text-rose-500">*</span>
              </label>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(null) }}
                placeholder="请输入您的取件码"
                maxLength={30}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300 text-center text-lg font-mono tracking-widest"
              />
            </div>

            <p className="text-xs text-gray-400 mt-3 text-center">
              输入任意一个取件码即可查询服务状态
            </p>
          </section>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <p className="text-sm text-rose-600">{error}</p>
            </div>
          )}

          {/* 提交按钮 */}
          <div className="pt-4 pb-8">
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                code.trim() && !loading
                  ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>正在查询...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>查询服务状态</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 提示卡片 */}
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">什么是服务状态查询？</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                通过取件码可以查看您的服务有效期、设备在线状态等信息。如有疑问，请联系您的专属客服。
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-400 pb-4">
          <p>© 2025 津合智能 · AI赋能银发经济</p>
        </footer>
      </div>
    </div>
  )
}

export default CustomerStatus

