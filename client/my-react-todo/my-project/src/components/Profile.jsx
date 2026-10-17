import { useState, useEffect } from 'react'

const inputClass =
  'w-full h-10 px-3 bg-slate-100 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-xl focus:outline-none transition-colors duration-200'

export default function Profile() {
  const [user, setUser] = useState({ name: 'Singmey', email: 'singmey@example.com' })
  const [draft, setDraft] = useState(user)
  const [editing, setEditing] = useState(false)

  // 1. Fetch profile from NestJS API on load
  useEffect(() => {
    fetch('http://localhost:3000/api/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser(data)
          setDraft(data)
        }
      })
      .catch((err) => console.error('Failed to load profile:', err))
  }, [])

  // 2. Save profile changes to NestJS API
  const save = async () => {
    if (draft.name.trim() === '') return
    setUser(draft)
    setEditing(false)
    try {
      await fetch('http://localhost:3000/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 w-full mb-5">
        <input
          className={inputClass}
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Username"
        />
        <input
          className={inputClass}
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          placeholder="Email"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            className="h-9 px-4 bg-purple-800 text-white font-bold rounded-xl cursor-pointer hover:bg-purple-900 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="h-9 px-4 text-slate-500 dark:text-slate-400 cursor-pointer hover:opacity-70 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between w-full mb-5">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 min-w-0">
        <div className="w-7 h-7 rounded-full bg-purple-800 text-white text-sm font-bold flex items-center justify-center shrink-0">
          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <span className="font-semibold truncate">{user.name}</span>
        <span className="text-sm text-slate-400 truncate hidden sm:inline">{user.email}</span>
      </div>
      <button
        onClick={() => {
          setDraft(user)
          setEditing(true)
        }}
        className="text-sm text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors cursor-pointer shrink-0"
      >
        Edit profile
      </button>
    </div>
  )
}
