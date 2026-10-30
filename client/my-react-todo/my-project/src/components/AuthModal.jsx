import { useState } from 'react'

export default function AuthModal({ onLogin, onSignup }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Please fill in both email and password')
      return
    }

    setLoading(true)
    try {
      if (isSignup) {
        await onSignup({ email, password, name, role })
      } else {
        await onLogin({ email, password })
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setError('409 Conflict: Email already registered. Please login or use another email.')
      } else if (err.response?.status === 401) {
        setError('401 Unauthorized: Invalid email or password.')
      } else if (err.response?.data?.message) {
        const msg = err.response.data.message
        setError(Array.isArray(msg) ? msg.join(', ') : msg)
      } else {
        setError(err.message || 'Authentication failed. Please check backend connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fillPreset = (presetEmail, presetName, presetRole) => {
    setEmail(presetEmail)
    setPassword('password123')
    setName(presetName)
    setRole(presetRole)
    setError('')
  }

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 flex flex-col transition-all duration-200">
      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-purple-500/30 mb-3">
          ✓
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          {isSignup ? 'Create an Account' : 'Welcome Back'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isSignup ? 'Sign up to manage your private tasks' : 'Log in to access your scoped to-do list'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => {
            setIsSignup(false)
            setError('')
          }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            !isSignup
              ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setIsSignup(true)
            setError('')
          }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
            isSignup
              ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Sign Up
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium leading-relaxed">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {isSignup && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice Doe"
              className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Password (min 6 characters)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 transition"
          />
        </div>

        {isSignup && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Account Role (Stretch Requirement)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                  role === 'user'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Standard User
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition ${
                  role === 'admin'
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                Admin (@Roles)
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 mt-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : isSignup ? (
            'Sign Up'
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Preset Fillers for quick testing with two users */}
      <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
        <p className="text-xs text-center text-slate-400 dark:text-slate-500 mb-2 font-medium">
          Quick test presets (Lab Step 6 & 2-User validation):
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fillPreset('user1@example.com', 'User 1', 'user')}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            User 1
          </button>
          <button
            type="button"
            onClick={() => fillPreset('user2@example.com', 'User 2', 'user')}
            className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
          >
            User 2
          </button>
          <button
            type="button"
            onClick={() => fillPreset('admin@example.com', 'Admin User', 'admin')}
            className="text-xs px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 transition"
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  )
}
