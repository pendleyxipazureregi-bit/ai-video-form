import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { adminFetch } from '../utils/api'

const PLATFORM_OPTIONS = [
  { value: '', label: '全部平台' },
  { value: '抖音', label: '抖音' },
  { value: '快手', label: '快手' },
  { value: '小红书', label: '小红书' },
  { value: '视频号', label: '视频号' },
]

const STATE_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700',
  resolved: 'bg-green-50 text-green-700',
  ignored: 'bg-gray-100 text-gray-500',
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function truncate(str, len = 60) {
  if (!str) return '-'
  return str.length > len ? str.slice(0, len) + '…' : str
}

function DetailToggle({ label, content }) {
  const [open, setOpen] = useState(false)

  if (!content) return <span className="text-gray-400 text-sm">-</span>

  return (
    <div>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium transition-colors"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {open ? '收起' : (label || '详情')}
      </button>
      {open && (
        <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap break-all max-w-xs">
          {content}
        </pre>
      )}
    </div>
  )
}

const LIMIT = 20

function ErrorReports() {
  const [reports, setReports] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  // 筛选状态
  const [filterDeviceId, setFilterDeviceId] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [appliedDeviceId, setAppliedDeviceId] = useState('')
  const [appliedPlatform, setAppliedPlatform] = useState('')

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchReports = useCallback(async (p, deviceId, platform) => {
    setLoading(true)
    try {
      let url = `/api/device/reports?page=${p}&limit=${LIMIT}`
      if (deviceId) url += `&deviceId=${encodeURIComponent(deviceId)}`
      if (platform) url += `&platform=${encodeURIComponent(platform)}`
      const data = await adminFetch(url)
      if (data.ok) {
        setReports(data.reports || [])
        setTotal(data.total || 0)
      }
    } catch {
      // adminFetch 已处理 401
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReports(page, appliedDeviceId, appliedPlatform)
  }, [page, appliedDeviceId, appliedPlatform, fetchReports])

  const handleSearch = () => {
    setAppliedDeviceId(filterDeviceId.trim())
    setAppliedPlatform(filterPlatform)
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilterDeviceId('')
    setFilterPlatform('')
    setAppliedDeviceId('')
    setAppliedPlatform('')
    setPage(1)
  }

  const hasFilters = appliedDeviceId || appliedPlatform

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">错误报告</h1>
          <p className="text-sm text-gray-400">共 {total} 条记录</p>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="设备 ID"
            value={filterDeviceId}
            onChange={(e) => setFilterDeviceId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
          />
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
          >
            {PLATFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
          {hasFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              清除
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
        </div>
      ) : reports.length === 0 ? (
        /* 空状态 */
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <AlertTriangle className="w-10 h-10 mb-2" />
          <p className="text-sm">暂无错误报告</p>
        </div>
      ) : (
        <>
          {/* 桌面端表格 */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">时间</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">设备ID</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">平台</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">步骤</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">错误信息</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">AI 操作</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">AI 结果</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reports.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDateTime(r.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                          {truncate(r.device_id, 16)}
                        </code>
                      </td>
                      <td className="px-4 py-4">
                        {r.platform ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            {r.platform}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 max-w-[160px] truncate" title={r.step}>
                        {r.step || '-'}
                      </td>
                      <td className="px-4 py-4 max-w-[200px]">
                        <DetailToggle label="查看" content={r.error_msg} />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {r.ai_action || '-'}
                      </td>
                      <td className="px-4 py-4 max-w-[180px]">
                        <DetailToggle label="查看" content={r.ai_result} />
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATE_COLORS[r.state] || 'bg-gray-100 text-gray-500'}`}>
                          {r.state || '未知'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 移动端卡片列表 */}
          <div className="md:hidden space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {r.platform && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {r.platform}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATE_COLORS[r.state] || 'bg-gray-100 text-gray-500'}`}>
                      {r.state || '未知'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(r.created_at)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  设备：
                  <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                    {truncate(r.device_id, 20)}
                  </code>
                </div>
                {r.step && (
                  <div className="text-sm text-gray-600 mb-1">
                    步骤：{r.step}
                  </div>
                )}
                {r.ai_action && (
                  <div className="text-sm text-gray-600 mb-1">
                    AI 操作：{r.ai_action}
                  </div>
                )}
                <div className="mt-2 flex gap-4">
                  <DetailToggle label="错误信息" content={r.error_msg} />
                  <DetailToggle label="AI 结果" content={r.ai_result} />
                </div>
              </div>
            ))}
          </div>

          {/* 分页控件 */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
              上一页
            </button>
            <span className="text-sm text-gray-500">
              第 {page} 页 / 共 {totalPages} 页
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 hover:bg-gray-100"
            >
              下一页
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ErrorReports

