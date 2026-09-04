import { useState, useEffect } from 'react'

function TimetableManager() {
  const [schedule, setSchedule] = useState([])
  const [subjects, setSubjects] = useState([])
  const [editId, setEditId] = useState(null)
  const [formData, setFormData] = useState({ day_of_week: 'Monday', subject_name: '', start_time: '', end_time: '', teacher: '', notes: '' })

  const loadData = () => {
    fetch('http://127.0.0.1:5000/api/subjects').then(res => res.json()).then(data => setSubjects(data))
    fetch('http://127.0.0.1:5000/api/timetable').then(res => res.json()).then(data => setSchedule(data))
  }

  useEffect(() => { loadData() }, [])

  const addOrEditClass = (e) => {
    e.preventDefault()
    if (!formData.subject_name || !formData.start_time) return 

    const url = editId ? `http://127.0.0.1:5000/api/timetable/${editId}` : 'http://127.0.0.1:5000/api/timetable'
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
      day_of_week: c.day_of_week, subject_name: c.subject_name, start_time: c.start_time, end_time: c.end_time, teacher: c.teacher, notes: c.notes
    })
    setEditId(c.id)
  }

  const deleteClass = (id) => {
    fetch(`http://127.0.0.1:5000/api/timetable/${id}`, { method: 'DELETE' }).then(() => setSchedule(schedule.filter(c => c.id !== id)))
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const scheduleByDay = days.reduce((acc, day) => {
    acc[day] = schedule.filter(c => c.day_of_week === day)
    return acc
  }, {})

  const validSubjects = subjects.filter(sub => sub.name && sub.name.trim() !== '')

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl h-full flex flex-col">
      <h2 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-emerald-400">📅</span> The 2D Matrix
      </h2>
      
      <form onSubmit={addOrEditClass} className="flex flex-col gap-4 mb-8 bg-gray-900/50 p-5 rounded-xl border border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})} className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500">
            {days.map(day => <option key={day} value={day}>{day}</option>)}
          </select>
          
          {/* THE DATALIST - You can TYPE in here now! */}
          <input 
            type="text" 
            list="subject-options" 
            placeholder="Type or select subject" 
            value={formData.subject_name} 
            onChange={e => setFormData({...formData, subject_name: e.target.value})} 
            className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500" 
          />
          <datalist id="subject-options">
            {validSubjects.map(sub => <option key={sub.id} value={sub.name} />)}
          </datalist>

          <input type="text" placeholder="Start (09:00 AM)" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500" />
          <input type="text" placeholder="End (11:00 AM)" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="text" placeholder="Teacher" value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value})} className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500" />
          <input type="text" placeholder="Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="md:col-span-2 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500" />
          <div className="flex gap-2">
            <button type="submit" className={`flex-1 ${editId ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'} text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-lg`}>
              {editId ? 'Update' : 'Schedule'}
            </button>
            {editId && <button type="button" onClick={() => { setEditId(null); setFormData({ day_of_week: 'Monday', subject_name: '', start_time: '', end_time: '', teacher: '', notes: '' }) }} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg transition-colors">Cancel</button>}
          </div>
        </div>
      </form>

      <div className="overflow-x-auto flex-1 bg-gray-900/30 rounded-xl border border-gray-700/50">
        <table className="w-full text-left border-collapse min-w-max">
          <tbody className="divide-y divide-gray-700/50">
            {days.map(day => (
              <tr key={day} className="hover:bg-gray-800/20 transition-colors">
                <td className="p-4 w-32 font-bold text-emerald-400 border-r border-gray-700/50 align-top">{day}</td>
                <td className="p-4 flex gap-4 overflow-x-auto">
                  {scheduleByDay[day].length === 0 ? (
                    <span className="text-gray-600 italic text-sm py-2">No classes</span>
                  ) : (
                    scheduleByDay[day].map(c => (
                      <div key={c.id} className="bg-gray-800 p-4 rounded-xl border border-gray-600 min-w-[220px] relative group hover:border-emerald-500/50 transition-all">
                        <div className="text-xs font-mono text-gray-400 mb-1">{c.start_time} - {c.end_time}</div>
                        <div className="text-lg font-heading font-bold text-white leading-tight">{c.subject_name}</div>
                        <div className="text-sm font-medium text-emerald-500/80 mb-2">{c.teacher}</div>
                        {c.notes && <div className="text-xs text-gray-500 italic truncate">{c.notes}</div>}
                        
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                          <button onClick={() => editClass(c)} className="text-amber-400 hover:text-amber-300 text-xs font-bold">Edit</button>
                          <button onClick={() => deleteClass(c.id)} className="text-red-400 hover:text-red-300 text-xs font-bold">Del</button>
                        </div>
                      </div>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TimetableManager