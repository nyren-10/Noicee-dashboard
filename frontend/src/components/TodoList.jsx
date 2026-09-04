import { useState, useEffect } from 'react'

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

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
      <h2 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-blue-400">⚡</span> Survival Tasks
      </h2>
      
      {/* FIXED FORM: flex-col for mobile, sm:flex-row for desktop */}
      <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input 
          type="text" 
          value={newTask} 
          onChange={(e) => setNewTask(e.target.value)} 
          placeholder="What are you procrastinating on?" 
          className="flex-1 w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
        />
        <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20">
          Add
        </button>
      </form>

      <ul className="space-y-3">
        {tasks.map(task => (
          <li key={task.id} className="flex items-center gap-4 p-4 bg-gray-900/50 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
            <input 
              type="checkbox" 
              checked={task.is_completed} 
              onChange={() => toggleTask(task.id, task.is_completed)} 
              className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 cursor-pointer shrink-0"
            />
            <span className={`flex-1 text-lg ${task.is_completed ? 'line-through text-gray-500' : 'text-gray-200'} break-words`}>
              {task.title}
            </span>
            <button 
              onClick={() => deleteTask(task.id)} 
              className="text-gray-500 hover:text-red-400 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-all text-sm font-medium shrink-0"
            >
              Trash
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-500 italic">No tasks. You're either caught up or lying to yourself.</div>
        )}
      </ul>
    </div>
  )
}

export default TodoList