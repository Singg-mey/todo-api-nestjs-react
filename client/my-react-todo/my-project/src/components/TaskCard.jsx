const NEXT_STATUS = { 'To Do': 'In Progress', 'In Progress': 'Done', Done: 'To Do' }

const BADGE = {
  'To Do': 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  'In Progress': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Done: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
}

// hidden until hover (always visible on touch screens)
const reveal =
  'opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity'

export default function TaskCard({
  task,
  isSelected,
  selectionMode,
  isDragging,
  onToggleSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onDrop,
  onDragEnd,
}) {
  const isDone = task.status === 'Done'

  const handleEdit = () => {
    const newText = prompt('Edit your task: ', task.title)
    if (newText === null || newText.trim() === '') return
    onUpdate(task.id, { title: newText.trim() })
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(task.id)}
      onDragEnd={onDragEnd}
      className={`task-card group flex items-center justify-between gap-3 h-14 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 transition-colors duration-200 ${
        isSelected ? 'ring-2 ring-purple-500' : ''
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          className={`w-5 h-5 shrink-0 rounded cursor-pointer ${
            selectionMode || isSelected ? 'opacity-100' : reveal
          }`}
        />

        <button
          onClick={() => onUpdate(task.id, { starred: !task.starred })}
          className={`text-xl leading-none cursor-pointer ${
            task.starred
              ? 'text-yellow-400'
              : `text-slate-300 dark:text-slate-600 hover:text-yellow-400 ${reveal}`
          }`}
          title="Mark as priority"
        >
          {task.starred ? '★' : '☆'}
        </button>

        <span
          className={`font-sans text-lg truncate text-slate-700 dark:text-slate-200 ${
            isDone ? 'line-through text-slate-400/70 italic' : ''
          }`}
        >
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onUpdate(task.id, { status: NEXT_STATUS[task.status] })}
          className={`text-xs font-semibold px-3 py-1 rounded-full cursor-pointer transition-colors ${BADGE[task.status]}`}
          title="Click to change status"
        >
          {task.status}
        </button>

        <button
          onClick={handleEdit}
          className={`text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors cursor-pointer p-1 ${reveal}`}
          title="Edit"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
          </svg>
        </button>

        <button
          onClick={() => onDelete(task.id)}
          className={`text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer p-1 ${reveal}`}
          title="Delete"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  )
}