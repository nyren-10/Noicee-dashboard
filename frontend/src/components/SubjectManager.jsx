import { useState, useEffect } from 'react'

function SubjectManager() {
  const [subjects, setSubjects] = useState([])
  const [newSubject, setNewSubject] = useState('')
  const [initialAttended, setInitialAttended] = useState('')
  const [initialTotal, setInitialTotal] = useState('')
  
  // Upgraded Edit State
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editAttended, setEditAttended] = useState('')
  const [editTotal, setEditTotal] = useState('')

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/subjects').then(res => res.json()).then(data => setSubjects(data))
  }, [])

  const addSubject = (e) => {
    e.preventDefault()
    if (!newSubject.trim()) return

    fetch('http://127.0.0.1:5000/api/subjects', {
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
    fetch(`http://127.0.0.1:5000/api/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attended: newAttended, total_classes: newTotal })
    }).then(() => {
      setSubjects(subjects.map(s => s.id === id ? { ...s, attended: newAttended, total_classes: newTotal } : s))
    })
  }

  const deleteSubject = (id) => {
    if(!window.confirm("Warning: Deleting this subject will also delete all its classes from the timetable! You sure?")) return;
    fetch(`http://127.0.0.1:5000/api/subjects/${id}`, { method: 'DELETE' })
      .then(() => setSubjects(subjects.filter(s => s.id !== id)))
  }

  const saveEdit = (id) => {
    if (!editName.trim()) return;
    
    const updatedAttended = parseInt(editAttended) || 0;
    const updatedTotal = parseInt(editTotal) || 0;

    fetch(`http://127.0.0.1:5000/api/subjects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: editName,
        attended: updatedAttended,
        total_classes: updatedTotal
      })
    }).then(() => {
      setSubjects(subjects.map(s => s.id === id ? { 
        ...s, 
        name: editName, 
        attended: updatedAttended, 
        total_classes: updatedTotal 
      } : s))
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
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
     {/* FIXED HEADER: Stack on mobile, side-by-side on desktop */}
     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
          <span className="text-purple-400">📊</span> RTU Hitlist
        </h2>
        <button 
          onClick={(e) => {
            e.target.innerText = "Syncing...";
            fetch('http://127.0.0.1:5000/api/sync-email', { method: 'POST' })
              .then(res => res.json())
              .then(data => {
                alert(data.message || data.error);
                e.target.innerText = "📧 Sync via Gmail";
                window.location.reload(); 
              });
          }}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all flex justify-center items-center gap-2 text-sm"
        >
          📧 Sync via Gmail
        </button>
      </div>
      
      {/* FIXED FORM: Flex wrap logic so inputs don't crush each other */}
      <form onSubmit={addSubject} className="flex flex-col md:flex-row gap-3 mb-8 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
        <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject name..." className="flex-1 w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500" />
        <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto">
          <input type="number" min="0" value={initialAttended} onChange={(e) => setInitialAttended(e.target.value)} placeholder="Attended" className="flex-1 min-w-[80px] sm:w-24 bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 text-sm" />
          <input type="number" min="0" value={initialTotal} onChange={(e) => setInitialTotal(e.target.value)} placeholder="Total" className="flex-1 min-w-[80px] sm:w-24 bg-gray-900 border border-gray-700 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 text-sm" />
          <button type="submit" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-purple-500/20">Add</button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {validSubjects.map(sub => {
          const percentage = sub.total_classes === 0 ? 100 : Math.round((sub.attended / sub.total_classes) * 100)
          const isDanger = percentage < 75

          return (
            <li key={sub.id} className="list-none p-5 bg-gray-900/50 rounded-xl border border-gray-700/50 flex flex-col gap-4 hover:border-gray-600 transition-colors">
              <div className="flex justify-between items-start mb-2">
                {editingId === sub.id ? (
                  <div className="flex flex-col gap-3 w-full mr-2 bg-gray-900 p-3 rounded-lg border border-gray-700">
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-purple-500" placeholder="Subject Name" />
                    
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-gray-400 text-xs font-bold uppercase">Att:</span>
                        <input type="number" min="0" value={editAttended} onChange={e => setEditAttended(e.target.value)} className="bg-gray-800 text-white border border-gray-600 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:border-purple-500" />
                      </div>
                      <span className="text-gray-500 font-bold hidden sm:block">/</span>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-gray-400 text-xs font-bold uppercase">Tot:</span>
                        <input type="number" min="0" value={editTotal} onChange={e => setEditTotal(e.target.value)} className="bg-gray-800 text-white border border-gray-600 rounded-lg px-2 py-1.5 w-full text-sm focus:outline-none focus:border-purple-500" />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-1">
                      <button onClick={() => saveEdit(sub.id)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2 rounded-lg transition-colors">Save</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold py-2 rounded-lg transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <strong className="text-lg font-heading text-gray-100 truncate pr-2">{sub.name}</strong>
                    <div className="flex gap-3 items-center shrink-0">
                      <button onClick={() => startEditing(sub)} className="text-amber-400 hover:text-amber-300 text-xs font-bold">Edit</button>
                      <button onClick={() => deleteSubject(sub.id)} className="text-red-400 hover:text-red-300 text-xs font-bold">Del</button>
                      <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDanger ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {percentage}%
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {editingId !== sub.id && (
                <>
                  <div className="text-sm text-gray-500 mb-2">Attended {sub.attended} out of {sub.total_classes} classes</div>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => markAttendance(sub.id, sub.attended, sub.total_classes, true)} className="flex-1 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-semibold transition-all">Showed Up</button>
                    <button onClick={() => markAttendance(sub.id, sub.attended, sub.total_classes, false)} className="flex-1 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm font-semibold transition-all">Bunked</button>
                  </div>
                </>
              )}
            </li>
          )
        })}
      </div>
    </div>
  )
}

export default SubjectManager