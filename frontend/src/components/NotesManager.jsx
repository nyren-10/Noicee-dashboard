import { useState, useEffect } from 'react'

function NotesManager() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const loadNotes = () => {
    fetch('http://127.0.0.1:5000/api/notes').then(res => res.json()).then(data => setNotes(data))
  }

  useEffect(() => { loadNotes() }, [])

  const saveNote = (e) => {
    e.preventDefault()
    if (!content.trim()) return
    fetch('http://127.0.0.1:5000/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'Untitled Note', content })
    }).then(() => {
      loadNotes()
      setTitle('')
      setContent('')
    })
  }

  const deleteNote = (id) => {
    fetch(`http://127.0.0.1:5000/api/notes/${id}`, { method: 'DELETE' }).then(loadNotes)
  }

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col h-[80vh]">
      <h2 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-blue-400">📝</span> Thoughts & Notes
      </h2>
      
      <form onSubmit={saveNote} className="mb-8 flex flex-col gap-3">
        <input type="text" placeholder="Note Title (Optional)" value={title} onChange={e => setTitle(e.target.value)} className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
        <textarea placeholder="Write something valuable..." value={content} onChange={e => setContent(e.target.value)} className="bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 h-24 resize-none focus:outline-none focus:border-blue-500"></textarea>
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold self-end shadow-md">Save Note</button>
      </form>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
        {notes.map(note => (
          <div key={note.id} className="bg-gray-900 p-5 rounded-xl border border-gray-700 relative group flex flex-col">
            <h4 className="text-white font-bold mb-2 pr-6">{note.title}</h4>
            <p className="text-gray-400 text-sm whitespace-pre-wrap flex-1">{note.content}</p>
            <button onClick={() => deleteNote(note.id)} className="absolute top-4 right-4 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-300 text-xs font-bold transition-opacity">Del</button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default NotesManager