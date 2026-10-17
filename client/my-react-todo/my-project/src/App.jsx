import { useState, useEffect } from 'react'
import Profile from './components/Profile'
import TaskCard from './components/TaskCard'

const API = 'http://localhost:3000/api/todos'
const FILTERS = ['All', 'To Do', 'In Progress', 'Done']
const STATUSES = ['To Do', 'In Progress', 'Done']

// Status converter between UI and NestJS API
const toApiStatus = (s) => (s === 'In Progress' ? 'IN_PROGRESS' : s === 'Done' ? 'DONE' : 'TODO')
const toUiStatus = (s) => (s === 'IN_PROGRESS' ? 'In Progress' : s === 'DONE' ? 'Done' : 'To Do')

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [tasks, setTasks] = useState([])
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [dragId, setDragId] = useState(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  // 1. Load tasks from API on mount
  const loadTasksFromApi = () => {
    fetch(API)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTasks(data.map((t) => ({ ...t, status: toUiStatus(t.status) }))))
      .catch((err) => console.error('Failed to load todos from API:', err))
  }

  useEffect(() => {
    loadTasksFromApi()
  }, [])

  // 2. Add task via POST /api/todos
  const addTask = async () => {
    if (input.trim() === '') {
      alert('Please type a valid input!')
      return
    }
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.trim(), status: 'TODO' }),
      })
      if (res.ok) {
        const created = await res.json()
        setTasks((prev) => [...prev, { ...created, status: toUiStatus(created.status) }])
        setInput('')
      }
    } catch (err) {
      console.error('Failed to add task:', err)
    }
  }

  // 3. Update task via PATCH /api/todos/:id
  const updateTask = async (id, changes) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)))
    const payload = {}
    if (changes.title !== undefined) payload.title = changes.title
    if (changes.status !== undefined) payload.status = toApiStatus(changes.status)

    if (Object.keys(payload).length > 0) {
      await fetch(`${API}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => console.error('Failed to update task:', err))
    }
  }

  // 4. Delete task via DELETE /api/todos/:id
  const deleteTask = async (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setSelected((prev) => prev.filter((s) => s !== id))
    await fetch(`${API}/${id}`, { method: 'DELETE' }).catch((err) =>
      console.error('Failed to delete task:', err)
    )
  }

  const toggleSelect = (id) =>
    setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  const bulkDelete = async () => {
    const toDelete = [...selected]
    setTasks((prev) => prev.filter((t) => !toDelete.includes(t.id)))
    setSelected([])
    await Promise.all(toDelete.map((id) => fetch(`${API}/${id}`, { method: 'DELETE' })))
  }

  const bulkStatus = async (status) => {
    if (!status) return
    const toUpdate = [...selected]
    setTasks((prev) => prev.map((t) => (toUpdate.includes(t.id) ? { ...t, status } : t)))
    setSelected([])
    await Promise.all(
      toUpdate.map((id) =>
        fetch(`${API}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: toApiStatus(status) }),
        })
      )
    )
  }

  const visible = tasks.filter(
    (t) =>
      (filter === 'All' || t.status === filter) &&
      t.title.toLowerCase().includes(search.toLowerCase())
  )

  const allVisibleSelected = visible.length > 0 && visible.every((t) => selected.includes(t.id))

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelected(selected.filter((id) => !visible.some((t) => t.id === id)))
    } else {
      setSelected([...new Set([...selected, ...visible.map((t) => t.id)])])
    }
  }

  const handleDrop = (targetId) => {
    if (dragId === null || dragId === targetId) return
    const from = tasks.findIndex((t) => t.id === dragId)
    const to = tasks.findIndex((t) => t.id === targetId)
    const copy = [...tasks]
    const [moved] = copy.splice(from, 1)
    copy.splice(to, 0, moved)
    setTasks(copy)
    setDragId(null)
  }

  return (
    <div className="bg-slate-200 text-slate-900 dark:bg-slate-950 dark:text-white min-h-screen flex flex-col items-center px-4 py-16 transition-colors duration-200">
      <div className="w-full max-w-xl min-h-[400px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-md p-8 flex flex-col transition-colors duration-200">
        {/* HEADER */}
        <div className="flex items-center justify-between w-full mb-5">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white">To-do List</h1>
          <button
            onClick={() => setDark(!dark)}
            className="hover:opacity-70 transition cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          </button>
        </div>

        <Profile />

        {/* ADD TASK */}
        <div className="flex items-center w-full mb-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Type your task here..."
            className="w-full h-12 px-4 border border-slate-200 bg-white text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-l-xl border-r-0 focus:outline-none transition-colors duration-200"
          />
          <button
            onClick={addTask}
            className="h-12 px-6 bg-purple-800 text-white font-bold shrink-0 rounded-r-xl cursor-pointer hover:bg-purple-900 transition-colors"
          >
            Add +
          </button>
        </div>

        {/* FILTER + SEARCH */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-sm font-semibold cursor-pointer transition-colors ${
                  filter === f
                    ? 'bg-white text-purple-800 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 min-w-32 h-9 px-3 text-sm bg-slate-100 text-slate-900 placeholder-slate-400 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 rounded-full focus:outline-none"
          />
        </div>

        {/* BULK BAR */}
        {selected.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap mb-4 px-4 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">{selected.length} selected</span>
            <button
              onClick={toggleSelectAll}
              className="text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
            >
              {allVisibleSelected ? 'Deselect all' : 'Select all'}
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <select
                value=""
                onChange={(e) => bulkStatus(e.target.value)}
                className="rounded-lg bg-white dark:bg-slate-800 px-2 py-1 cursor-pointer focus:outline-none"
              >
                <option value="">Set status...</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={bulkDelete}
                className="px-3 py-1 rounded-lg bg-red-600 text-white font-semibold cursor-pointer hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setSelected([])}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer px-1"
                title="Clear selection"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* TASK LIST */}
        <div className="flex flex-col gap-2 w-full">
          {visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selected.includes(task.id)}
              selectionMode={selected.length > 0}
              isDragging={dragId === task.id}
              onToggleSelect={toggleSelect}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onDragStart={setDragId}
              onDrop={handleDrop}
              onDragEnd={() => setDragId(null)}
            />
          ))}
          {visible.length === 0 && (
            <p className="text-center text-slate-400 py-10">
              {tasks.length === 0 ? 'Nothing here yet. Add your first task!' : 'No matching tasks.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
