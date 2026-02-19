import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Shield, Loader2 } from 'lucide-react'

function AdminLogin() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // 如果已有 token，自动跳转到 /admin
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      navigate('/admin', { replace: true })
    }
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (response.ok && data.token) {
        localStorage.setItem('admin_token', data.token)
        navigate('/admin', { replace: true })
      } else {
        setError(data.message || '登录失败，请检查用户名和密码')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接后重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 font-display">管理员登录</h1>
            <p className="text-gray-400 text-sm mt-2">请输入管理员账号和密码</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    setError(null)
                  }}
                  placeholder="请输入用户名"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                  placeholder="请输入密码"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-xl text-gray-800 placeholder-gray-400 focus:bg-white focus:border-primary-500 transition-all duration-300"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <Lock className="w-4 h-4 text-rose-500 flex-shrink-0" />
                <p className="text-sm text-rose-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>登录中...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>登录</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 津合智能 · 管理后台
        </p>
      </div>
    </div>
  )
}

export default AdminLogin

