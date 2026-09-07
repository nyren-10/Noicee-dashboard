import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function TimetableManager() {
  const [schedule, setSchedule] = useState([])
  const [subjects, setSubjects] = useState([])
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({
    day_of_week: 'Monday',
    subject_name: '',
    start_time: '',
    end_time: '',
    teacher: '',
    notes: ''
  })

  const loadData = () => {
    fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/subjects`).then(res => res.json()).then(data => setSubjects(data))
    fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/timetable`).then(res => res.json()).then(data => setSchedule(data))
  }

  useEffect(() => { loadData() }, [])

  const addOrEditClass = (e) => {
    e.preventDefault()
    if (!formData.subject_name || !formData.start_time) return

    const url = editId ? ``${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/timetable/${editId}` : `${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/timetable`
    fetch(url, {
      method: editId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    }).then(() => {
      loadData()
      setFormData({ day_of_week: 'Monday', subject_name: '', start_time: '', end_time: '', teacher: '', notes: '' })
      setEditId(null)
    })
  }

  const editClass = (c) => {
    setFormData({
      day_of_week: c.day_of_week,
      subject_name: c.subject_name,
      start_time: c.start_time,
      end_time: c.end_time,
      teacher: c.teacher,
      notes: c.notes
    })
    setEditId(c.id)
  }

  const deleteClass = (id) => {
    fetch(``${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/timetable/${id}`, { method: `DELETE' })
      .then(() => setSchedule(schedule.filter(c => c.id !== id)))
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const scheduleByDay = days.reduce((acc, day) => {
    acc[day] = schedule.filter(c => c.day_of_week === day)
    return acc
  }, {})

  const validSubjects = subjects.filter(sub => sub.name && sub.name.trim() !== '')

  const DAY_SHORT = { Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED', Thursday: 'THU', Friday: 'FRI', Saturday: 'SAT' }

  return (
    <div className="glass-card p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
          📅
        </div>
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            The 2D Matrix
          </h2>
          <p className="text-xs text-slate-500">{schedule.length} classes scheduled</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={addOrEditClass}
        className="flex flex-col gap-4 mb-8 p-5 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={formData.day_of_week}
            onChange={e => setFormData({ ...formData, day_of_week: e.target.value })}
            className="glass-input rounded-lg px-3 py-2.5 text-sm"
          >
            {days.map(day => <option key={day} value={day} style={{ background: '#0f0f14' }}>{day}</option>)}
          </select>

          <input
            type="text"
            list="subject-options"
            placeholder="Type or select subject"
            value={formData.subject_name}
            onChange={e => setFormData({ ...formData, subject_name: e.target.value })}
            className="glass-input rounded-lg px-3 py-2.5 text-sm"
          />
          <datalist id="subject-options">
            {validSubjects.map(sub => <option key={sub.id} value={sub.name} />)}
          </datalist>

          <input
            type="text"
            placeholder="Start (09:00 AM)"
            value={formData.start_time}
            onChange={e => setFormData({ ...formData, start_time: e.target.value })}
            className="glass-input rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            type="text"
            placeholder="End (11:00 AM)"
            value={formData.end_time}
            onChange={e => setFormData({ ...formData, end_time: e.target.value })}
            className="glass-input rounded-lg px-3 py-2.5 text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Teacher"
            value={formData.teacher}
            onChange={e => setFormData({ ...formData, teacher: e.target.value })}
            className="glass-input rounded-lg px-4 py-2.5 text-sm"
          />
          <input
            type="text"
            placeholder="Notes"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            className="glass-input md:col-span-2 rounded-lg px-4 py-2.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: editId ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #059669, #10b981)',
                boxShadow: editId ? '0 4px 15px rgba(217,119,6,0.3)' : '0 4px 15px rgba(16,185,129,0.3)',
                color: 'white'
              }}
            >
              {editId ? 'Update' : 'Schedule'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => { setEditId(null); setFormData({ day_of_week: 'Monday', subject_name: '', start_time: '', end_time: '', teacher: '', notes: '' }) }}
                className="btn-ghost px-4 py-2.5 rounded-lg text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Timetable Grid */}
      <div className="overflow-x-auto flex-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-left border-collapse min-w-max">
          <tbody>
            {days.map((day, di) => (
              <motion.tr
                key={day}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: di * 0.05 }}
                className="transition-colors"
                style={{ borderBottom: di < days.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <td className="p-4 w-28 align-top">
                  <span className="text-xs font-black text-slate-500 tracking-widest">{DAY_SHORT[day]}</span>
                </td>
                <td className="p-4 flex gap-3 overflow-x-auto">
                  <AnimatePresence>
                    {scheduleByDay[day].length === 0 ? (
                      <span className="text-slate-700 italic text-sm py-2">No classes</span>
                    ) : (
                      scheduleByDay[day].map((c, ci) => (
                        <motion.div
                          key={c.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ delay: ci * 0.04 }}
                          whileHover={{ y: -3, transition: { duration: 0.15 } }}
                          className="p-4 rounded-xl min-w-[200px] relative group"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                        >
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <div className="text-[11px] font-mono text-slate-500 tracking-tight">{c.start_time} — {c.end_time}</div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 shrink-0 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-sm border border-white/10">
                              <button onClick={() => editClass(c)} className="text-amber-400 hover:text-amber-300 text-[10px] font-bold uppercase tracking-wider">Edit</button>
                              <button onClick={() => deleteClass(c.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-wider">Del</button>
                            </div>
                          </div>
                          <div className="text-base font-bold text-white leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {c.subject_name}
                          </div>
                          {c.teacher && (
                            <div className="text-xs font-medium text-emerald-400/80 mt-0.5">{c.teacher}</div>
                          )}
                          {c.notes && (
                            <div className="text-xs text-slate-600 italic truncate mt-1">{c.notes}</div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TimetableManager
