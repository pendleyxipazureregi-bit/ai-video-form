import { useState, useEffect, useCallback } from 'react'
import { FileText, ChevronLeft, ChevronRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { adminFetch } from '../utils/api'

const ACTION_MAP = {
  create_customer: '新建客户',
  update_customer: '修改客户',
  generate_codes: '生成取件码',
  update_code: '修改取件码',
}

const TARGET_MAP = {
  customer: '客户',
  pickup_code: '取件码',
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function formatDetail(detail) {
  if (!detail || typeof detail !== 'object') return '-'
  return Object.entries(detail)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n')
}

function DetailToggle({ detail }) {
  const [open, setOpen] = useState(false)

  if (!detail || typeof detail !== 'object' || Object.keys(detail).length === 0) {
    return <span className="text-gray-400 text-sm">-</span>
  }

  return (
    <div>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800 font-medium transition-colors"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {open ? '收起' : '详情'}
      </button>
      {open && (
        <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap break-all max-w-xs">
          {formatDetail(detail)}
        </pre>
      )}
    </div>
  )
}

const LIMIT = 20

function AdminLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const fetchLogs = useCallback(async (p) => {
    setLoading(true)
    try {
      const data = await adminFetch(`/api/admin/logs?page=${p}&limit=${LIMIT}`)
      if (data.success) {
        setLogs(data.logs || [])
        setTotal(data.total || 0)
      }
    } catch {
      // adminFetch 已处理 401
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(page)
  }, [page, fetchLogs])

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <FileText className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">操作日志</h1>
          <p className="text-sm text-gray-400">共 {total} 条记录</p>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
        </div>
      ) : logs.length === 0 ? (
        /* 空状态 */
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <FileText className="w-10 h-10 mb-2" />
          <p className="text-sm">暂无操作日志</p>
        </div>
      ) : (
        <>
          {/* 桌面端表格 */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作时间</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作人</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作类型</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">操作对象</th>
                  <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                        {log.admin_id}
                      </code>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {ACTION_MAP[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {TARGET_MAP[log.target_type] || log.target_type}
                      {log.target_id && (
                        <span className="text-gray-400 ml-1">#{log.target_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <DetailToggle detail={log.detail} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 移动端卡片列表 */}
          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div
                key={log.log_id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    {ACTION_MAP[log.action] || log.action}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                  <span className="text-gray-500">
                    操作人：
                    <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono">
                      {log.admin_id}
                    </code>
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  对象：{TARGET_MAP[log.target_type] || log.target_type}
                  {log.target_id && (
                    <span className="text-gray-400 ml-1">#{log.target_id}</span>
                  )}
                </div>
                <DetailToggle detail={log.detail} />
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

export default AdminLogs

