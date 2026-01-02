import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  KeyRound, 
  Building2, 
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
  RotateCcw
} from 'lucide-react'

// API 端点
const DOWNLOAD_API = '/api/get-download-url'

// 行业列表 - id 直接使用中文名称，匹配腾讯云 COS 目录结构
const industries = [
  { id: '康养旅居', name: '康养旅居', icon: '🏡' },
  { id: '房产销售', name: '房产销售', icon: '🏢' },
  { id: '教育培训', name: '教育培训', icon: '📚' },
  { id: '医疗健康', name: '医疗健康', icon: '🏥' },
  { id: '旅游出行', name: '旅游出行', icon: '✈️' },
  { id: '金融理财', name: '金融理财', icon: '💰' },
  { id: '零售电商', name: '零售电商', icon: '🛒' },
  { id: '餐饮美食', name: '餐饮美食', icon: '🍜' },
  { id: '其他行业', name: '其他行业', icon: '📦' }
]

function PickupPage({ onBack }) {
  const [selectedIndustry, setSelectedIndustry] = useState(null)
  const [pickupCode, setPickupCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // 文件夹视图状态
  const [folderData, setFolderData] = useState(null)
  const [downloadingFile, setDownloadingFile] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 验证
    if (!selectedIndustry) {
      setError('请选择您的行业')
      return
    }
    
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
          pickupCode: pickupCode.trim(),
          industry: selectedIndustry
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

  // 返回输入界面
  const handleBackToInput = () => {
    setFolderData(null)
    setError(null)
  }

  // 完全重置
  const handleReset = () => {
    setFolderData(null)
    setError(null)
    setPickupCode('')
    setSelectedIndustry(null)
  }

  // 文件夹视图 - 显示文件列表
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
                  📂 当前目录：{folderData.folderName}
                </h2>
                <p className="text-sm text-gray-500">
                  {folderData.industry} · 共 {folderData.fileCount} 个视频
                </p>
              </div>
            </div>
            
            {/* 返回按钮 */}
            <button
              onClick={handleBackToInput}
              className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回上级</span>
            </button>
          </motion.div>

          {/* 文件列表 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {folderData.files.map((file, index) => (
              <motion.div
                key={file.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="bg-white rounded-xl p-4 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* 视频图标 */}
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Film className="w-7 h-7 text-primary-600" />
                  </div>
                  
                  {/* 文件信息 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {file.sizeFormatted}
                      </span>
                    </div>
                  </div>
                  
                  {/* 下载按钮 */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDownload(file)}
                    disabled={downloadingFile === file.name}
                    className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-all ${
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
                        <span>下载</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* 底部操作区 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 space-y-4"
          >
            {/* 下载全部提示 */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 text-center">
              <p className="text-sm text-emerald-700">
                💡 点击文件右侧按钮可单独下载每个视频
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
              选择行业并输入取件码，查看并下载您的AI生成视频
            </p>
          </div>
        </motion.header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Industry Selection */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-primary-500" />
              </div>
              <label className="text-sm font-semibold text-gray-700">
                选择行业 <span className="text-rose-500">*</span>
              </label>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {industries.map((industry) => (
                <motion.button
                  key={industry.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedIndustry(industry.id)
                    setError(null)
                  }}
                  className={`p-3 rounded-xl text-center transition-all duration-300 ${
                    selectedIndustry === industry.id
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl mb-1 block">{industry.icon}</span>
                  <span className="text-xs font-medium">{industry.name}</span>
                </motion.button>
              ))}
            </div>
          </motion.section>

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
              disabled={isLoading || !selectedIndustry || !pickupCode.trim()}
              whileTap={{ scale: 0.98 }}
              className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                selectedIndustry && pickupCode.trim() && !isLoading
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
