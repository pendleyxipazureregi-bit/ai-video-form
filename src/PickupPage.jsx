import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  KeyRound, 
  Download, 
  CheckCircle2, 
  ArrowLeft,
  FileVideo,
  Sparkles,
  AlertCircle,
  Loader2,
  FolderOpen,
  Film,
  HardDrive,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  User,
  Copy,
  Check
} from 'lucide-react'

// API 端点
const DOWNLOAD_API = '/api/get-download-url'

// 从完整路径中提取账号名（取件码后的下一级目录）
function extractAccountName(key, pickupCode) {
  // 路径格式: 行业/取件码/账号名/文件名.mp4
  const parts = key.split('/')
  const pickupIndex = parts.findIndex(p => p === pickupCode)
  
  if (pickupIndex !== -1 && pickupIndex + 1 < parts.length - 1) {
    // 取件码后面的那一级就是账号名
    return parts[pickupIndex + 1]
  }
  
  // 如果没有子文件夹，返回默认值
  return '默认'
}

function PickupPage({ onBack }) {
  const [pickupCode, setPickupCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // 文件夹视图状态
  const [folderData, setFolderData] = useState(null)
  const [downloadingFile, setDownloadingFile] = useState(null)
  const [copiedFile, setCopiedFile] = useState(null)
  
  // 折叠状态管理 - 记录每个账号是否展开
  const [expandedAccounts, setExpandedAccounts] = useState({})

  // 按账号分组文件
  const groupedVideos = useMemo(() => {
    if (!folderData?.files) return {}
    
    const groups = {}
    folderData.files.forEach(file => {
      const accountName = extractAccountName(file.key, folderData.folderName)
      if (!groups[accountName]) {
        groups[accountName] = []
      }
      groups[accountName].push(file)
    })
    
    // 对每个组内的文件按名称排序
    Object.keys(groups).forEach(account => {
      groups[account].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    })
    
    return groups
  }, [folderData])

  // 获取账号列表（按名称排序）
  const accountNames = useMemo(() => {
    return Object.keys(groupedVideos).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  }, [groupedVideos])

  // 初始化所有账号为展开状态
  const initializeExpandedState = (groups) => {
    const initialState = {}
    Object.keys(groups).forEach(account => {
      initialState[account] = true // 默认展开
    })
    setExpandedAccounts(initialState)
  }

  // 切换账号折叠状态
  const toggleAccountExpand = (accountName) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountName]: !prev[accountName]
    }))
  }

  // 展开全部
  const expandAll = () => {
    const newState = {}
    accountNames.forEach(account => {
      newState[account] = true
    })
    setExpandedAccounts(newState)
  }

  // 折叠全部
  const collapseAll = () => {
    const newState = {}
    accountNames.forEach(account => {
      newState[account] = false
    })
    setExpandedAccounts(newState)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 验证
    if (!pickupCode.trim()) {
      setError('请输入取件码')
      return
    }
    
    setError(null)
    setIsLoading(true)
    
    try {
      const response = await fetch(DOWNLOAD_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickupCode: pickupCode.trim()
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.files && data.files.length > 0) {
        // 成功获取文件列表，进入文件夹视图
        setFolderData({
          folderName: data.folderName,
          industry: data.industry,
          fileCount: data.fileCount,
          files: data.files
        })
        
        // 初始化折叠状态（所有账号默认展开）
        const groups = {}
        data.files.forEach(file => {
          const accountName = extractAccountName(file.key, data.folderName)
          if (!groups[accountName]) {
            groups[accountName] = []
          }
          groups[accountName].push(file)
        })
        initializeExpandedState(groups)
      } else {
        setError(data.message || '未找到该取件码对应的文件')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 下载单个文件
  const handleDownload = (file) => {
    setDownloadingFile(file.name)
    
    // 创建隐藏的 a 标签触发下载
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 延迟重置状态
    setTimeout(() => {
      setDownloadingFile(null)
    }, 2000)
  }

  // 复制链接
  const handleCopyLink = async (file) => {
    try {
      await navigator.clipboard.writeText(file.url)
      setCopiedFile(file.name)
      setTimeout(() => {
        setCopiedFile(null)
      }, 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 返回输入界面
  const handleBackToInput = () => {
    setFolderData(null)
    setError(null)
    setExpandedAccounts({})
  }

  // 完全重置
  const handleReset = () => {
    setFolderData(null)
    setError(null)
    setPickupCode('')
    setExpandedAccounts({})
  }

  // 文件夹视图 - 显示按账号分组的文件列表
  if (folderData) {
    return (
      <div className="min-h-screen pb-safe">
        {/* Decorative Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -left-20 w-60 h-60 bg-primary-200/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-amber-200/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-lg mx-auto px-4 py-6">
          {/* 文件夹头部 */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 mb-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <FolderOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-800">
                  📂 取件码：{folderData.folderName}
                </h2>
                <p className="text-sm text-gray-500">
                  {folderData.industry} · {accountNames.length} 个账号 · 共 {folderData.fileCount} 个视频
                </p>
              </div>
            </div>
            
            {/* 操作按钮区 */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToInput}
                className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>返回上级</span>
              </button>
              
              {/* 展开/折叠全部按钮 */}
              {accountNames.length > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    展开全部
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={collapseAll}
                    className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    折叠全部
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* 按账号分组显示文件列表 */}
          <div className="space-y-4">
            {accountNames.map((accountName, groupIndex) => {
              const accountFiles = groupedVideos[accountName]
              const isExpanded = expandedAccounts[accountName] !== false
              
              return (
                <motion.div
                  key={accountName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.1 }}
                  className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden"
                >
                  {/* 账号标题栏 - 可点击折叠/展开 */}
                  <button
                    onClick={() => toggleAccountExpand(accountName)}
                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    {/* 折叠图标 */}
                    <motion.div
                      animate={{ rotate: isExpanded ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </motion.div>
                    
                    {/* 账号图标 */}
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    
                    {/* 账号名称 */}
                    <div className="flex-1 text-left">
                      <h3 className="font-bold text-gray-800 text-base">
                        📂 {accountName}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {accountFiles.length} 个视频
                      </p>
                    </div>
                    
                    {/* 视频数量标签 */}
                    <div className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-xs font-medium">
                      {accountFiles.length} 个
                    </div>
                  </button>
                  
                  {/* 文件列表 - 可折叠 */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          {accountFiles.map((file, fileIndex) => (
                            <motion.div
                              key={file.name}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: fileIndex * 0.03 }}
                              className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                {/* 视频图标 */}
                                <div className="w-12 h-12 bg-gradient-to-br from-rose-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                  <Film className="w-6 h-6 text-rose-500" />
                                </div>
                                
                                {/* 文件信息 */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-800 text-sm truncate" title={file.name}>
                                    {file.name}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                    <span className="flex items-center gap-1">
                                      <HardDrive className="w-3 h-3" />
                                      {file.sizeFormatted}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* 操作按钮组 */}
                                <div className="flex gap-2">
                                  {/* 复制链接按钮 */}
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleCopyLink(file)}
                                    className={`p-2.5 rounded-xl transition-all ${
                                      copiedFile === file.name
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }`}
                                    title="复制链接"
                                  >
                                    {copiedFile === file.name ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </motion.button>
                                  
                                  {/* 下载按钮 */}
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleDownload(file)}
                                    disabled={downloadingFile === file.name}
                                    className={`px-3 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all ${
                                      downloadingFile === file.name
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40'
                                    }`}
                                  >
                                    {downloadingFile === file.name ? (
                                      <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>已下载</span>
                                      </>
                                    ) : (
                                      <>
                                        <Download className="w-4 h-4" />
                                        <span>下载原画 (推荐)</span>
                                      </>
                                    )}
                                  </motion.button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>

          {/* 底部操作区 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 space-y-4"
          >
            {/* 下载提示 - 警告风格 */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 text-center">
              <p className="text-sm text-orange-700 font-medium">
                📱 安卓用户请注意：在线播放可能会卡顿，强烈推荐点击"下载原画"保存到相册，观看丝滑流畅！
              </p>
            </div>
            
            {/* 返回重新输入 */}
            <button
              onClick={handleReset}
              className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              领取其他取件码
            </button>
            
            <button
              onClick={onBack}
              className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors"
            >
              返回首页
            </button>
          </motion.div>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-gray-400 pt-8 pb-4"
          >
            <p>© 2025 津合智能 · AI赋能银发经济</p>
          </motion.footer>
        </div>
      </div>
    )
  }

  // 输入取件码界面
  return (
    <div className="min-h-screen pb-safe">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-primary-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-amber-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回首页</span>
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm mb-4">
              <Package className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-600 font-medium">内容领取中心</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-primary-600 to-primary-700 bg-clip-text text-transparent font-display mb-3">
              领取您的专属内容
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              输入取件码，查看并下载您的AI生成视频
            </p>
          </div>
        </motion.header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Pickup Code Input */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <KeyRound className="w-4 h-4 text-amber-500" />
              </div>
              <label className="text-sm font-semibold text-gray-700">
                取件码 <span className="text-rose-500">*</span>
              </label>
            </div>
            
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={pickupCode}
                onChange={(e) => {
                  setPickupCode(e.target.value)
                  setError(null)
                }}
                placeholder="请输入您的取件码"
                maxLength={20}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300 text-center text-lg font-mono tracking-widest"
              />
            </div>
            
            <p className="text-xs text-gray-400 mt-3 text-center">
              取件码由津合智能客服提供
            </p>
          </motion.section>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl"
              >
                <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                <p className="text-sm text-rose-600">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-4 pb-8"
          >
            <motion.button
              type="submit"
              disabled={isLoading || !pickupCode.trim()}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                pickupCode.trim() && !isLoading
                  ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 text-white shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>正在查找文件...</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-5 h-5" />
                  <span>查看文件</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </form>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-5 mb-6"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">如何获取取件码？</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                取件码由津合智能客服在内容生成完成后提供。如果您尚未收到取件码，请联系您的专属客服获取。
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-gray-400 pb-4"
        >
          <p>© 2025 津合智能 · AI赋能银发经济</p>
        </motion.footer>
      </div>
    </div>
  )
}

export default PickupPage
