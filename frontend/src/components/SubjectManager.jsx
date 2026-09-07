import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function SubjectManager() {
  const [subjects, setSubjects] = useState([])
  const [newSubject, setNewSubject] = useState('')
  const [initialAttended, setInitialAttended] = useState('')
  const [initialTotal, setInitialTotal] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAttended, setEditAttended] = useState('')
  const [editTotal, setEditTotal] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/subjects`).then(res => res.json()).then(data => setSubjects(data))
  }, [])

  const addSubject = (e) => {
    e.preventDefault()
    if (!newSubject.trim()) return

    fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newSubject,
        attended: parseInt(initialAttended) || 0,
        total_classes: parseInt(initialTotal) || 0
      })
    }).then(res => res.json()).then(data => {
      setSubjects([...subjects, data])
      setNewSubject('')
      setInitialAttended('')
      setInitialTotal('')
    })
  }

  const markAttendance = (id, attended, total, didAttend) => {
    const newAttended = didAttend ? attended + 1 : attended
    const newTotal = total + 1
    const status = didAttend ? 'PRESENT' : 'ABSENT'
    fetch(``${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/subjects/${id}`, {
      method: `PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended: newAttended, total_classes: newTotal, source: 'MANUAL', status })
    }).then(() => {
      setSubjects(subjects.map(s => s.id === id ? { ...s, attended: newAttended, total_classes: newTotal } : s))
      window.dispatchEvent(new Event('attendance-updated'))
    })
  }

  const deleteSubject = (id) => {
    if (!window.confirm("Warning: Deleting this subject will also delete all its classes from the timetable! You sure?")) return
    fetch(``${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/subjects/${id}`, { method: `DELETE' })
      .then(() => setSubjects(subjects.filter(s => s.id !== id)))
  }

  const saveEdit = (id) => {
    if (!editName.trim()) return
    const updatedAttended = parseInt(editAttended) || 0
    const updatedTotal = parseInt(editTotal) || 0

    fetch(``${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/subjects/${id}`, {
      method: `PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, attended: updatedAttended, total_classes: updatedTotal })
    }).then(() => {
      setSubjects(subjects.map(s => s.id === id ? { ...s, name: editName, attended: updatedAttended, total_classes: updatedTotal } : s))
      setEditingId(null)
    })
  }

  const startEditing = (sub) => {
    setEditingId(sub.id)
    setEditName(sub.name)
    setEditAttended(sub.attended)
    setEditTotal(sub.total_classes)
  }

  const validSubjects = subjects.filter(sub => sub.name && sub.name.trim() !== '')

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
          📊
        </div>
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>RTU Hitlist</h2>
          <p className="text-xs text-slate-500">{validSubjects.length} subjects tracked</p>
        </div>
      </div>

      {/* Add Subject Form */}
      <form onSubmit={addSubject} className="flex flex-col md:flex-row gap-3 mb-8 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <input
          type="text"
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Subject name..."
          className="glass-input flex-1 w-full rounded-xl px-4 py-2.5 text-sm"
        />
        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
          <input
            type="number"
            min="0"
            value={initialAttended}
            onChange={(e) => setInitialAttended(e.target.value)}
            placeholder="Attended"
            className="glass-input flex-1 min-w-[80px] sm:w-24 rounded-xl px-3 py-2.5 text-sm"
          />
          <input
            type="number"
            min="0"
            value={initialTotal}
            onChange={(e) => setInitialTotal(e.target.value)}
            placeholder="Total"
            className="glass-input flex-1 min-w-[80px] sm:w-24 rounded-xl px-3 py-2.5 text-sm"
          />
          <button type="submit" className="btn-primary w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm">
            Add
          </button>
        </div>
      </form>

      {/* Subject Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {validSubjects.map((sub, i) => {
            const percentage = sub.total_classes === 0 ? 100 : Math.round((sub.attended / sub.total_classes) * 100)
            const isDanger = percentage < 75

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                whileHover={{ y: -2 }}
                className="p-5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {editingId === sub.id ? (
                  <div className="flex flex-col gap-3">
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="glass-input rounded-lg px-3 py-2 w-full text-sm" placeholder="Subject Name" />
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-slate-500 text-xs font-bold uppercase">Att:</span>
                        <input type="number" min="0" value={editAttended} onChange={e => setEditAttended(e.target.value)} className="glass-input rounded-lg px-2 py-1.5 w-full text-sm" />
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-slate-500 text-xs font-bold uppercase">Tot:</span>
                        <input type="number" min="0" value={editTotal} onChange={e => setEditTotal(e.target.value)} className="glass-input rounded-lg px-2 py-1.5 w-full text-sm" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(sub.id)} className="btn-success flex-1 py-2 rounded-lg text-sm">Save</button>
                      <button onClick={() => setEditingId(null)} className="btn-ghost flex-1 py-2 rounded-lg text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <strong className="text-base font-semibold text-white truncate pr-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {sub.name}
                      </strong>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => startEditing(sub)} className="text-amber-400 hover:text-amber-300 text-xs font-bold transition-colors">Edit</button>
                        <button onClick={() => deleteSubject(sub.id)} className="text-slate-600 hover:text-red-400 text-xs font-bold transition-colors">Del</button>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDanger ? 'badge-danger' : 'badge-success'}`}>
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: isDanger ? 'linear-gradient(90deg, #dc2626, #f97316)' : 'linear-gradient(90deg, #059669, #10b981)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percentage, 100)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>

                    <div className="text-xs text-slate-500 mb-3">
                      {sub.attended} attended / {sub.total_classes} total
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => markAttendance(sub.id, sub.attended, sub.total_classes, true)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all badge-success hover:bg-emerald-500/20"
                      >
                        ✓ Showed Up
                      </button>
                      <button
                        onClick={() => markAttendance(sub.id, sub.attended, sub.total_classes, false)}
                        className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all badge-danger hover:bg-red-500/20"
                      >
                        ✗ Bunked
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default SubjectManager
