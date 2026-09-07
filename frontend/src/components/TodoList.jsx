import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: [0.23, 1, 0.32, 1] }
  })
}

function TodoList() {
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/tasks')
      .then(res => res.json())
      .then(data => setTasks(data))
      .catch(err => console.error("Flask is dead:", err))
  }, [])

  const addTask = (e) => {
    e.preventDefault()
    if (!newTask.trim()) return

    fetch('http://127.0.0.1:5000/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTask })
    }).then(res => res.json()).then(data => {
      setTasks([...tasks, data])
      setNewTask('')
    })
  }

  const toggleTask = (id, currentStatus) => {
    fetch(`http://127.0.0.1:5000/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: !currentStatus })
    }).then(() => setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t)))
  }

  const deleteTask = (id) => {
    fetch(`http://127.0.0.1:5000/api/tasks/${id}`, { method: 'DELETE' })
      .then(() => setTasks(tasks.filter(t => t.id !== id)))
  }

  const completed = tasks.filter(t => t.is_completed).length
  const total = tasks.length
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
            ⚡
          </div>
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Survival Tasks</h2>
            <p className="text-xs text-slate-500">{completed}/{total} completed</p>
          </div>
        </div>
        {total > 0 && (
          <div className="text-right">
            <div className="text-2xl font-black text-blue-400">{progress}%</div>
            <div className="text-xs text-slate-500">done</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-6 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Add task form */}
      <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="What are you procrastinating on?"
          className="glass-input flex-1 w-full rounded-xl px-4 py-3 text-sm"
        />
        <button type="submit" className="btn-primary w-full sm:w-auto px-6 py-3 rounded-xl text-sm">
          Add Task
        </button>
      </form>

      {/* Task list */}
      <ul className="space-y-2">
        {tasks.map((task, i) => (
          <motion.li
            key={task.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center gap-4 px-4 py-3.5 rounded-xl group transition-all"
            style={{
              background: task.is_completed ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)'
            }}
          >
            <input
              type="checkbox"
              checked={task.is_completed}
              onChange={() => toggleTask(task.id, task.is_completed)}
              className="w-4 h-4 rounded border-none cursor-pointer shrink-0 accent-blue-500"
            />
            <span className={`flex-1 text-sm ${task.is_completed ? 'line-through text-slate-600' : 'text-slate-200'} break-words`}>
              {task.title}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              className="text-slate-600 hover:text-red-400 transition-colors text-xs font-medium px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100"
              style={{ background: 'rgba(239,68,68,0.08)' }}
            >
              Del
            </button>
          </motion.li>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-slate-600 italic text-sm">
            No tasks. You're either caught up or lying to yourself.
          </div>
        )}
      </ul>
    </div>
  )
}

export default TodoList