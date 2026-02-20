import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Loader2, RefreshCw, Wifi, WifiOff, Battery,
  BatteryWarning, Clock, Smartphone, Activity, AlertTriangle,
  Video, Calendar, User, ToggleRight, ToggleLeft, Settings,
  Send, History, MessageSquare, RotateCcw, Download, Trash2, ChevronDown, ChevronUp, Check, X
} from 'lucide-react'
import { adminFetch, formatDate, timeAgo, daysUntil } from '../utils/api'

function DeviceDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // 指令相关状态
  const [cmdType, setCmdType] = useState('message')
  const [cmdPayload, setCmdPayload] = useState('')
  const [cmdSending, setCmdSending] = useState(false)
  const [cmdResult, setCmdResult] = useState(null) // { ok, msg }
  const [cmdHistory, setCmdHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchDevice = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await adminFetch(`/api/admin/codes?code=${encodeURIComponent(code)}`)
      if (data.success) {
        setDevice(data.device)
      }
    } catch {
      // handled by adminFetch
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [code])

  useEffect(() => {
    fetchDevice()
  }, [fetchDevice])

  // 自动刷新（每30秒）
  useEffect(() => {
    if (!autoRefresh) return
    const timer = setInterval(() => fetchDevice(true), 30000)
    return () => clearInterval(timer)
  }, [autoRefresh, fetchDevice])

  const isOnline = (lastHeartbeat) => {
    if (!lastHeartbeat) return false
    return Date.now() - new Date(lastHeartbeat).getTime() < 24 * 60 * 60 * 1000
  }

  // 发送指令
  const sendCommand = async () => {
    setCmdSending(true)
    setCmdResult(null)
    try {
      let payload = {}
      if (cmdPayload.trim()) {
        try {
          payload = JSON.parse(cmdPayload)
        } catch {
          payload = { message: cmdPayload }
        }
      }
      const data = await adminFetch(`/api/admin/codes?code=${encodeURIComponent(code)}&`, {
        method: 'PATCH',
        body: JSON.stringify({ commandType: cmdType, payload })
      })
      if (data.success) {
        setCmdResult({ ok: true, msg: '指令已发送' })
        setCmdPayload('')
        // 刷新历史
        if (showHistory) fetchCmdHistory()
      } else {
        setCmdResult({ ok: false, msg: data.message || '发送失败' })
      }
    } catch (err) {
      setCmdResult({ ok: false, msg: err.message || '网络错误' })
    } finally {
      setCmdSending(false)
      setTimeout(() => setCmdResult(null), 3000)
    }
  }

  // 获取指令历史
  const fetchCmdHistory = async () => {
    setHistoryLoading(true)
    try {
      const data = await adminFetch(`/api/admin/codes?code=${encodeURIComponent(code)}&action=history`, {
        method: 'PATCH'
      })
      if (data.success) {
        setCmdHistory(data.commands || [])
      }
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }

  const toggleHistory = () => {
    const next = !showHistory
    setShowHistory(next)
    if (next && cmdHistory.length === 0) fetchCmdHistory()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p>设备不存在或加载失败</p>
        <button onClick={() => navigate(-1)} className="mt-2 text-primary-600 hover:underline text-sm">
          返回
        </button>
      </div>
    )
  }

  const online = isOnline(device.lastHeartbeat)
  const hasBound = !!device.deviceId
  const monitor = device.monitorData || {}

  return (
    <div className="space-y-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <div className="flex items-center gap-3">
          {/* 自动刷新开关 */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? '自动刷新中' : '自动刷新'}
          </button>
          {/* 手动刷新 */}
          <button
            onClick={() => fetchDevice(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {/* 设备概览卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-gray-400" />
              {device.deviceAlias || device.deviceModel || '未命名设备'}
            </h2>
            <code className="text-sm text-gray-500 font-mono mt-1 inline-block">{device.pickupCode}</code>
          </div>
          <div className="flex items-center gap-2">
            {/* 启用状态 */}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              device.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {device.isActive ? '已启用' : '已停用'}
            </span>
            {/* 在线状态 */}
            {hasBound && (
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                online ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
              }`}>
                <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`} />
                {online ? '在线' : '离线'}
              </span>
            )}
          </div>
        </div>

        {/* 基础信息网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <InfoCell label="设备ID" value={device.deviceId || '-'} />
          <InfoCell label="设备型号" value={device.deviceModel || '-'} />
          <InfoCell label="App版本" value={device.appVersion || '-'} />
          <InfoCell label="系统版本" value={device.osVersion || '-'} />
          <InfoCell label="最后心跳" value={device.lastHeartbeat ? timeAgo(device.lastHeartbeat) : '从未上报'} />
          <InfoCell label="最后发布" value={device.lastPublishTime ? timeAgo(device.lastPublishTime) : '-'} />
          <InfoCell label="取件码创建" value={formatDate(device.codeCreatedAt)} />
          <InfoCell label="绑定状态" value={hasBound ? '已绑定' : '未绑定'} />
        </div>
      </div>

      {/* 关联客户卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          关联客户
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoCell label="客户名称">
            <Link
              to={`/admin/customers/${device.customerId}`}
              className="text-primary-600 hover:text-primary-700 hover:underline font-medium text-sm"
            >
              {device.customerName}
            </Link>
          </InfoCell>
          <InfoCell label="套餐" value={planLabel(device.plan)} />
          <InfoCell label="到期日期" value={formatDate(device.endDate)} />
          <InfoCell label="客户状态">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              device.customerStatus === 'suspended'
                ? 'bg-gray-100 text-gray-600'
                : daysUntil(device.endDate) < 0
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-emerald-50 text-emerald-600'
            }`}>
              {device.customerStatus === 'suspended' ? '已暂停' : daysUntil(device.endDate) < 0 ? '已过期' : '正常'}
            </span>
          </InfoCell>
        </div>
      </div>

      {/* 实时监控面板 */}
      {hasBound && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            实时监控
            {monitor.reportedAt && (
              <span className="text-xs text-gray-400 font-normal ml-auto">
                数据上报于 {timeAgo(monitor.reportedAt)}
              </span>
            )}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* 电量 */}
            <MonitorCard
              icon={monitor.batteryLevel != null && monitor.batteryLevel <= 20 ? BatteryWarning : Battery}
              label="电池电量"
              value={monitor.batteryLevel != null ? `${monitor.batteryLevel}%` : '-'}
              color={monitor.batteryLevel != null && monitor.batteryLevel <= 20 ? 'rose' : monitor.batteryLevel != null && monitor.batteryLevel <= 50 ? 'orange' : 'emerald'}
            />
            {/* WiFi */}
            <MonitorCard
              icon={monitor.wifiConnected ? Wifi : WifiOff}
              label="WiFi连接"
              value={monitor.wifiConnected != null ? (monitor.wifiConnected ? '已连接' : '未连接') : '-'}
              color={monitor.wifiConnected ? 'emerald' : 'orange'}
            />
            {/* 今日发布 */}
            <MonitorCard
              icon={Video}
              label="今日发布"
              value={monitor.todayPublishCount != null ? `${monitor.todayPublishCount} 条` : '-'}
              color="blue"
            />
            {/* 待发视频 */}
            <MonitorCard
              icon={Clock}
              label="待发视频"
              value={monitor.pendingVideos != null ? `${monitor.pendingVideos} 条` : '-'}
              color="violet"
            />
            {/* 周期天数 */}
            <MonitorCard
              icon={Calendar}
              label="周期天数"
              value={monitor.cycleDay != null ? `第 ${monitor.cycleDay} 天` : '-'}
              color="blue"
            />
            {/* 运行时长 */}
            <MonitorCard
              icon={Activity}
              label="运行时长"
              value={monitor.uptimeMinutes != null ? formatUptime(monitor.uptimeMinutes) : '-'}
              color="emerald"
            />
          </div>

          {/* 今日平台 */}
          {monitor.todayPlatforms && monitor.todayPlatforms.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">今日发布平台</p>
              <div className="flex flex-wrap gap-2">
                {monitor.todayPlatforms.map((p, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 最近错误 */}
          {monitor.lastError && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-start gap-2 bg-rose-50 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-rose-700 mb-0.5">最近错误</p>
                  <p className="text-sm text-rose-600">{monitor.lastError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 配置快照 */}
      {device.configSnapshot && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            配置快照
          </h3>
          <pre className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-200 leading-relaxed">
            {JSON.stringify(device.configSnapshot, null, 2)}
          </pre>
        </div>
      )}

      {/* 设备指令面板 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Send className="w-4 h-4 text-gray-400" />
          发送指令
        </h3>

        {/* 指令类型选择 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">指令类型</label>
            <select
              value={cmdType}
              onChange={e => setCmdType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              {COMMAND_TYPES.map(ct => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              载荷 <span className="text-gray-400">(JSON 或文本)</span>
            </label>
            <input
              type="text"
              value={cmdPayload}
              onChange={e => setCmdPayload(e.target.value)}
              placeholder={cmdType === 'message' ? '输入通知消息...' : '{"key":"value"}'}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        {/* 发送按钮和结果 */}
        <div className="flex items-center gap-3">
          <button
            onClick={sendCommand}
            disabled={cmdSending}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            {cmdSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {cmdSending ? '发送中...' : '发送指令'}
          </button>
          <button
            onClick={toggleHistory}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            <History className="w-4 h-4" />
            {showHistory ? '收起历史' : '指令历史'}
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {cmdResult && (
            <span className={`flex items-center gap-1 text-sm font-medium ${cmdResult.ok ? 'text-emerald-600' : 'text-rose-600'}`}>
              {cmdResult.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {cmdResult.msg}
            </span>
          )}
        </div>

        {/* 指令历史 */}
        {showHistory && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            {historyLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : cmdHistory.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">暂无指令记录</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cmdHistory.map(cmd => (
                  <div key={cmd.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <CommandTypeIcon type={cmd.command_type} />
                      <div>
                        <span className="font-medium text-gray-800">
                          {COMMAND_TYPES.find(ct => ct.value === cmd.command_type)?.label || cmd.command_type}
                        </span>
                        {cmd.payload && Object.keys(typeof cmd.payload === 'string' ? JSON.parse(cmd.payload) : cmd.payload).length > 0 && (
                          <span className="ml-2 text-gray-400 text-xs font-mono">
                            {JSON.stringify(typeof cmd.payload === 'string' ? JSON.parse(cmd.payload) : cmd.payload).slice(0, 60)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CommandStatusBadge status={cmd.status} />
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {timeAgo(cmd.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* 辅助组件: 信息单元 */
function InfoCell({ label, value, children }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {children || <p className="text-sm font-medium text-gray-800 truncate">{value}</p>}
    </div>
  )
}

/* 辅助组件: 监控数据卡 */
function MonitorCard({ icon: Icon, label, value, color = 'gray' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    gray: 'bg-gray-50 text-gray-700',
  }
  const iconColors = {
    emerald: 'text-emerald-500',
    orange: 'text-orange-500',
    rose: 'text-rose-500',
    blue: 'text-blue-500',
    violet: 'text-violet-500',
    gray: 'text-gray-500',
  }
  return (
    <div className={`rounded-xl px-4 py-3 ${colors[color] || colors.gray}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColors[color] || iconColors.gray}`} />
        <span className="text-xs opacity-70">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}

/* 指令类型常量 */
const COMMAND_TYPES = [
  { value: 'message', label: '📩 发送通知', icon: MessageSquare },
  { value: 'reboot', label: '🔄 重启脚本', icon: RotateCcw },
  { value: 'update_config', label: '⚙️ 更新配置', icon: Settings },
  { value: 'force_publish', label: '📤 强制发布', icon: Send },
  { value: 'clear_cache', label: '🗑️ 清理缓存', icon: Trash2 },
]

/* 指令类型图标 */
function CommandTypeIcon({ type }) {
  const ct = COMMAND_TYPES.find(t => t.value === type)
  const Icon = ct?.icon || MessageSquare
  return <Icon className="w-4 h-4 text-gray-400" />
}

/* 指令状态徽标 */
function CommandStatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-600',
    sent: 'bg-blue-50 text-blue-600',
    delivered: 'bg-emerald-50 text-emerald-600',
    failed: 'bg-rose-50 text-rose-600',
  }
  const labels = {
    pending: '待发送',
    sent: '已发送',
    delivered: '已送达',
    failed: '失败',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}

/* 辅助函数 */
function planLabel(plan) {
  const map = { trial: '试用', basic: '基础', pro: '专业', enterprise: '企业' }
  return map[plan] || plan || '-'
}

function formatUptime(minutes) {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分` : `${h}小时`
}

export default DeviceDetail

