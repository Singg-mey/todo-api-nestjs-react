import { useState, useEffect } from 'react'
import api from '../api/axios.js'

const inputClass =
  'w-full h-10 px-3 bg-slate-100 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-xl focus:outline-none transition-colors duration-200'

export default function Profile({ currentUser, onLogout, onProfileUpdate }) {
  const [user, setUser] = useState(currentUser || { name: '', email: '', role: 'user' })
  const [draft, setDraft] = useState(user)
  const [editing, setEditing] = useState(false)

  // Synchronize when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser)
      setDraft(currentUser)
    }
  }, [currentUser])

  // Save profile changes via PATCH /api/profile
  const save = async () => {
    if (!draft.name?.trim()) return
    setUser(draft)
    setEditing(false)
    try {
      const res = await api.patch('/profile', { name: draft.name })
      if (res.data) {
        setUser(res.data)
        if (onProfileUpdate) onProfileUpdate(res.data)
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 w-full mb-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Display Name
        </label>
        <input
          className={inputClass}
          value={draft.name || ''}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Display Name"
        />
        <div className="flex gap-2 mt-1">
          <button
            onClick={save}
            className="h-8 px-4 bg-purple-700 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-purple-800 transition"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="h-8 px-4 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:opacity-70 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between w-full mb-5 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-sm">
          {user.name ? user.name.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {user.name || user.email}
            </span>
            {user.role === 'admin' ? (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                Admin
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                User
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 truncate">{user.email}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => {
            setDraft(user)
            setEditing(true)
          }}
          className="text-xs text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-300 transition cursor-pointer"
        >
          Edit
        </button>
        <button
          onClick={onLogout}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
