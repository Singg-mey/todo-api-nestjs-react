import { useState, useEffect } from 'react'
import api from '../api/axios.js'

export default function AdminTodos() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAdminTodos = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/todos')
      setTodos(res.data)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('403 Forbidden: Only admins can view global todos (@Roles("admin"))')
      } else {
        setError(err.message || 'Failed to load admin todos')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminTodos()
  }, [])

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            Global Admin Overview (GET /admin/todos)
          </h3>
          <p className="text-xs text-slate-400">
            Protected with @Roles('admin') & RolesGuard
          </p>
        </div>
        <button
          onClick={fetchAdminTodos}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading all todos...</div>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                  {todo.title}
                </span>
                <span className="text-[11px] text-slate-400">
                  Owner: {todo.owner?.email || `User #${todo.ownerId || 'unknown'}`}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  todo.status === 'DONE'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : todo.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                }`}
              >
                {todo.status}
              </span>
            </div>
          ))}

          {todos.length === 0 && !error && (
            <div className="py-6 text-center text-xs text-slate-400">No tasks in the entire system yet.</div>
          )}
        </div>
      )}
    </div>
  )
}
