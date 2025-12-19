import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import emailjs from 'emailjs-com'
import { 
  Sparkles, 
  MapPin, 
  Globe, 
  Plus, 
  X, 
  Users,
  AlertCircle,
  Sun,
  Send,
  CheckCircle2,
  User,
  Route,
  MessageSquare
} from 'lucide-react'

// EmailJS Configuration
const EMAILJS_CONFIG = {
  serviceId: 'service_pn2dnf8',
  templateId: 'template_bya70km',
  publicKey: 'nnfxGfqpFaGdvCtHB'
}

const tagData = {
  sellingPoints: {
    title: '卖点亮点',
    icon: Sparkles,
    color: 'emerald',
    items: ['森林氧吧', '适老化设计', '营养配餐', '医养结合', '丰富活动'],
    hasCustomInput: true
  },
  personas: {
    title: '目标人群',
    icon: Users,
    color: 'blue',
    items: ['退休夫妻', '单身女性', '候鸟族', '康养群体'],
    hasCustomInput: true
  },
  painPoints: {
    title: '痛点问题',
    icon: AlertCircle,
    color: 'rose',
    items: ['价格贵', '住宿差', '伙食不好', '交通不便', '医疗远'],
    hasCustomInput: true
  },
  scenarios: {
    title: '使用场景',
    icon: Sun,
    color: 'amber',
    items: ['避寒', '避暑', '换住旅游', '康养保健'],
    hasCustomInput: false
  }
}

const colorClasses = {
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    activeBg: 'bg-emerald-500',
    activeText: 'text-white',
    text: 'text-emerald-700',
    icon: 'text-emerald-500',
    focusBorder: 'focus:border-emerald-500'
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    activeBg: 'bg-blue-500',
    activeText: 'text-white',
    text: 'text-blue-700',
    icon: 'text-blue-500',
    focusBorder: 'focus:border-blue-500'
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    activeBg: 'bg-rose-500',
    activeText: 'text-white',
    text: 'text-rose-700',
    icon: 'text-rose-500',
    focusBorder: 'focus:border-rose-500'
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    activeBg: 'bg-amber-500',
    activeText: 'text-white',
    text: 'text-amber-700',
    icon: 'text-amber-500',
    focusBorder: 'focus:border-amber-500'
  }
}

function App() {
  // Basic info
  const [contactName, setContactName] = useState('')
  const [baseType, setBaseType] = useState('指定基地')
  const [singleBaseName, setSingleBaseName] = useState('')
  const [multipleBaseNames, setMultipleBaseNames] = useState([''])
  const [routePlan, setRoutePlan] = useState('')
  const [price, setPrice] = useState('')
  
  // Tags
  const [selectedTags, setSelectedTags] = useState({
    sellingPoints: [],
    personas: [],
    painPoints: [],
    scenarios: []
  })
  
  // Custom inputs for tag sections
  const [customInputs, setCustomInputs] = useState({
    sellingPoints: '',
    personas: '',
    painPoints: ''
  })
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submissionResult, setSubmissionResult] = useState(null)

  const handleAddBase = () => {
    setMultipleBaseNames([...multipleBaseNames, ''])
  }

  const handleRemoveBase = (index) => {
    if (multipleBaseNames.length > 1) {
      setMultipleBaseNames(multipleBaseNames.filter((_, i) => i !== index))
    }
  }

  const handleBaseNameChange = (index, value) => {
    const updated = [...multipleBaseNames]
    updated[index] = value
    setMultipleBaseNames(updated)
  }

  const toggleTag = (category, tag) => {
    setSelectedTags(prev => {
      const current = prev[category]
      if (current.includes(tag)) {
        return { ...prev, [category]: current.filter(t => t !== tag) }
      } else {
        return { ...prev, [category]: [...current, tag] }
      }
    })
  }

  const handleCustomInputChange = (category, value) => {
    setCustomInputs(prev => ({
      ...prev,
      [category]: value
    }))
  }

  // Format data for email template
  const formatEmailData = () => {
    const baseNames = baseType === '指定基地' 
      ? singleBaseName 
      : multipleBaseNames.filter(n => n.trim()).join('、')
    
    const formatTagSection = (key, title) => {
      const tags = selectedTags[key].join('、') || '未选择'
      const custom = customInputs[key] ? `\n  补充: ${customInputs[key]}` : ''
      return `${title}: ${tags}${custom}`
    }

    return {
      contactName,
      baseType,
      baseNames,
      routePlan: baseType === '全国换住' ? routePlan : '不适用',
      price: `¥${price} 元/月`,
      sellingPoints: formatTagSection('sellingPoints', '卖点亮点'),
      personas: formatTagSection('personas', '目标人群'),
      painPoints: formatTagSection('painPoints', '痛点问题'),
      scenarios: `使用场景: ${selectedTags.scenarios.join('、') || '未选择'}`,
      
      // Full formatted message for email body
      fullMessage: `
【津合智能客户合作清单】

━━━━━━━━━━━━━━━━━━━━━━
📋 基本信息
━━━━━━━━━━━━━━━━━━━━━━
联系人姓名: ${contactName}
基地类型: ${baseType}
${baseType === '指定基地' ? `基地名称: ${singleBaseName}` : `基地列表: ${baseNames}`}
${baseType === '全国换住' && routePlan ? `换住路线规划:\n${routePlan}` : ''}
价格: ¥${price} 元/月

━━━━━━━━━━━━━━━━━━━━━━
🏷️ 标签选择
━━━━━━━━━━━━━━━━━━━━━━
${formatTagSection('sellingPoints', '✨ 卖点亮点')}

${formatTagSection('personas', '👥 目标人群')}

${formatTagSection('painPoints', '⚠️ 痛点问题')}

🌤️ 使用场景: ${selectedTags.scenarios.join('、') || '未选择'}

━━━━━━━━━━━━━━━━━━━━━━
提交时间: ${new Date().toLocaleString('zh-CN')}
━━━━━━━━━━━━━━━━━━━━━━
      `.trim()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation check before submitting
    if (!contactName.trim()) {
      alert('⚠️ 请填写联系人姓名')
      return
    }
    
    if (!price.trim()) {
      alert('⚠️ 请填写价格')
      return
    }
    
    if (baseType === '指定基地' && !singleBaseName.trim()) {
      alert('⚠️ 请填写基地名称')
      return
    }
    
    if (baseType === '全国换住' && !multipleBaseNames.some(n => n.trim())) {
      alert('⚠️ 请至少填写一个基地名称')
      return
    }
    
    setIsSubmitting(true)
    
    // Merge tags with custom inputs
    const mergeTagsWithExtra = (tags, extra) => {
      const tagsStr = tags.length > 0 ? tags.join(', ') : '未选择'
      return extra.trim() ? `${tagsStr} | 补充：${extra.trim()}` : tagsStr
    }
    
    // Prepare base list
    const baseList = baseType === '指定基地' 
      ? singleBaseName 
      : multipleBaseNames.filter(n => n.trim()).join(', ')
    
    // Prepare template parameters with exact variable names
    const templateParams = {
      user_name: contactName,
      base_type: baseType,
      price: `¥${price} 元/月`,
      base_list: baseList,
      exchange_route: baseType === '全国换住' ? (routePlan.trim() || '未填写') : '不适用（指定基地模式）',
      selling_points_data: mergeTagsWithExtra(selectedTags.sellingPoints, customInputs.sellingPoints),
      personas_data: mergeTagsWithExtra(selectedTags.personas, customInputs.personas),
      pain_points_data: mergeTagsWithExtra(selectedTags.painPoints, customInputs.painPoints),
      scenarios_data: selectedTags.scenarios.length > 0 ? selectedTags.scenarios.join(', ') : '未选择',
      date: new Date().toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
    
    // Log the formatted data (for debugging)
    console.log('📧 EmailJS Template Params:', templateParams)
    
    try {
      // Send email via EmailJS
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        templateParams,
        EMAILJS_CONFIG.publicKey
      )
      
      setSubmissionResult({
        success: true,
        message: '🎉 表单已成功提交！邮件已发送给津合智能团队，我们会尽快与您联系。'
      })
      
      setIsSubmitted(true)
    } catch (error) {
      console.error('Email sending failed:', error)
      setSubmissionResult({
        success: false,
        message: '❌ 发送失败，请检查网络连接后重试。'
      })
      setIsSubmitted(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    const hasContactName = contactName.trim() !== ''
    const hasPrice = price.trim() !== ''
    
    if (baseType === '指定基地') {
      return hasContactName && singleBaseName.trim() !== '' && hasPrice
    } else {
      return hasContactName && multipleBaseNames.some(n => n.trim() !== '') && hasPrice
    }
  }

  const resetForm = () => {
    setIsSubmitted(false)
    setSubmissionResult(null)
    setContactName('')
    setSingleBaseName('')
    setMultipleBaseNames([''])
    setRoutePlan('')
    setPrice('')
    setSelectedTags({
      sellingPoints: [],
      personas: [],
      painPoints: [],
      scenarios: []
    })
    setCustomInputs({
      sellingPoints: '',
      personas: '',
      painPoints: ''
    })
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-sm w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`w-20 h-20 ${submissionResult?.success ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-rose-400 to-rose-600'} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            {submissionResult?.success ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : (
              <X className="w-10 h-10 text-white" />
            )}
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-3 font-display">
            {submissionResult?.success ? '提交成功！' : '提交失败'}
          </h2>
          
          <p className="text-gray-500 mb-4">
            {submissionResult?.message}
          </p>
          
          {submissionResult?.success && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 text-left text-sm text-gray-600 mb-6 max-h-48 overflow-y-auto">
                <p className="font-semibold mb-2">📋 已提交信息摘要：</p>
                <p>👤 联系人：{contactName}</p>
                <p>🏠 模式：{baseType}</p>
                <p>💰 价格：¥{price} 元/月</p>
                <p>🏷️ 已选标签：{
                  Object.values(selectedTags).flat().length > 0 
                    ? Object.values(selectedTags).flat().join('、')
                    : '无'
                }</p>
              </div>
              
              <motion.div
                className="flex justify-center gap-1 mb-6"
                initial="hidden"
                animate="visible"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-primary-600 rounded-full"
                    animate={{
                      y: [0, -10, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
              
              <p className="text-sm text-gray-400 mb-4">
                AI正在为您分析需求，生成专属获客视频...
              </p>
            </>
          )}
          
          {submissionResult?.success ? (
            <button
              onClick={resetForm}
              className="text-primary-600 font-medium hover:underline"
            >
              返回填写新表单
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsSubmitted(false)
                  setSubmissionResult(null)
                }}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium rounded-xl hover:shadow-lg transition-all"
              >
                🔄 重新提交
              </button>
              <button
                onClick={resetForm}
                className="text-gray-500 font-medium hover:underline text-sm"
              >
                返回修改表单
              </button>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-safe">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm mb-4">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-gray-600 font-medium">AI智能视频生成</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 bg-clip-text text-transparent font-display mb-3">
            津合智能客户合作清单
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            提交需求，AI为您自动生成获客视频
          </p>
        </motion.header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Contact Name - NEW */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50"
          >
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              联系人姓名 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="请输入您的姓名"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
              />
            </div>
          </motion.section>

          {/* Base Type Toggle */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50"
          >
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              基地类型 <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-3">
              {['指定基地', '全国换住'].map((type) => (
                <motion.button
                  key={type}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setBaseType(type)}
                  className={`flex-1 py-3.5 px-4 rounded-xl font-medium text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    baseType === type
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {type === '指定基地' ? (
                    <MapPin className="w-4 h-4" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  {type}
                </motion.button>
              ))}
            </div>
          </motion.section>

          {/* Base Name Input(s) */}
          <AnimatePresence mode="wait">
            <motion.section
              key={baseType}
              initial={{ x: baseType === '指定基地' ? -20 : 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: baseType === '指定基地' ? 20 : -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50"
            >
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                基地名称 <span className="text-rose-500">*</span>
              </label>

              {baseType === '指定基地' ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="relative"
                >
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={singleBaseName}
                    onChange={(e) => setSingleBaseName(e.target.value)}
                    placeholder="请输入基地名称"
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
                  />
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {multipleBaseNames.map((name, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative flex gap-2"
                    >
                      <div className="relative flex-1">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-600">{index + 1}</span>
                        </div>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleBaseNameChange(index, e.target.value)}
                          placeholder={`基地 ${index + 1} 名称`}
                          className="w-full pl-14 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
                        />
                      </div>
                      {multipleBaseNames.length > 1 && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveBase(index)}
                          className="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddBase}
                    className="w-full py-3.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-medium flex items-center justify-center gap-2 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/50 transition-all duration-300"
                  >
                    <Plus className="w-5 h-5" />
                    添加更多基地
                  </motion.button>
                </div>
              )}
            </motion.section>
          </AnimatePresence>

          {/* Route Plan Textarea - Only for 全国换住 */}
          <AnimatePresence>
            {baseType === '全国换住' && (
              <motion.section
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Route className="w-5 h-5 text-primary-500" />
                    <label className="text-sm font-semibold text-gray-700">
                      换住路线规划
                    </label>
                    <span className="text-xs text-gray-400 ml-auto">选填</span>
                  </div>
                  <textarea
                    value={routePlan}
                    onChange={(e) => setRoutePlan(e.target.value)}
                    placeholder="请详细描述您的换住路线规划，例如：&#10;• 春季（3-5月）：云南昆明&#10;• 夏季（6-8月）：贵州贵阳&#10;• 秋季（9-11月）：广西北海&#10;• 冬季（12-2月）：海南三亚"
                    rows={5}
                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300 resize-none"
                  />
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Price Input */}
          <motion.section
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50"
          >
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              价格 <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="请输入价格"
                className="w-full pl-10 pr-16 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">元/月</span>
            </div>
          </motion.section>

          {/* Tag Selection Sections */}
          {Object.entries(tagData).map(([key, { title, icon: Icon, color, items, hasCustomInput }], sectionIndex) => (
            <motion.section
              key={key}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 + sectionIndex * 0.1 }}
              className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg ${colorClasses[color].bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${colorClasses[color].icon}`} />
                </div>
                <label className="text-sm font-semibold text-gray-700">
                  {title}
                </label>
                <span className="text-xs text-gray-400 ml-auto">可多选</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((tag) => {
                  const isSelected = selectedTags[key].includes(tag)
                  return (
                    <motion.button
                      key={tag}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleTag(key, tag)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                        isSelected
                          ? `${colorClasses[color].activeBg} ${colorClasses[color].activeText} shadow-md`
                          : `${colorClasses[color].bg} ${colorClasses[color].text} hover:shadow-sm`
                      }`}
                    >
                      {tag}
                    </motion.button>
                  )
                })}
              </div>
              
              {/* Custom Input for this section */}
              {hasCustomInput && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className={`w-4 h-4 ${colorClasses[color].icon}`} />
                    <span className="text-xs text-gray-500">其他补充</span>
                  </div>
                  <input
                    type="text"
                    value={customInputs[key]}
                    onChange={(e) => handleCustomInputChange(key, e.target.value)}
                    placeholder={`输入${title}中没有的内容...`}
                    className={`w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 text-sm focus:bg-white ${colorClasses[color].focusBorder} transition-all duration-300`}
                  />
                </motion.div>
              )}
            </motion.section>
          ))}

          {/* Submit Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="pt-4 pb-8"
          >
            <motion.button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              whileTap={{ scale: isFormValid() ? 0.98 : 1 }}
              className={`w-full py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                isFormValid()
                  ? 'bg-gradient-to-r from-primary-600 via-primary-700 to-primary-600 text-white shadow-xl shadow-primary-500/30 hover:shadow-2xl hover:shadow-primary-500/40'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
                  />
                  <span>正在发送 AI 需求...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>提交</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </form>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-gray-400 pb-4"
        >
          <p>© 2025 津合智能 · AI赋能银发经济</p>
        </motion.footer>
      </div>
    </div>
  )
}

export default App
