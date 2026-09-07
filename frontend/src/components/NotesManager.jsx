import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function NotesManager() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedNote, setSelectedNote] = useState(null)

  const loadNotes = () => {
    fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/notes`).then(res => res.json()).then(data => setNotes(data))
  }

  useEffect(() => { loadNotes() }, [])

  const saveNote = (e) => {
    e.preventDefault()
    if (!content.trim()) return
    fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/notes`, {
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
    fetch(``${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/notes/${id}`, { method: `DELETE' }).then(loadNotes)
  }

  const NOTE_COLORS = [
    { bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.15)', dot: '#60a5fa' },
    { bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.15)', dot: '#c084fc' },
    { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', dot: '#34d399' },
    { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.15)', dot: '#fbbf24' },
    { bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.15)', dot: '#22d3ee' },
  ]

  return (
    <div className="glass-card p-6 flex flex-col" style={{ height: '80vh' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>
          📝
        </div>
        <div>
          <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Notes Vault</h2>
          <p className="text-xs text-slate-500">{notes.length} notes saved</p>
        </div>
      </div>

      {/* Add note form */}
      <form onSubmit={saveNote} className="mb-6 flex flex-col gap-3 shrink-0 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <input
          type="text"
          placeholder="Note title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="glass-input rounded-lg px-4 py-2.5 text-sm"
        />
        <textarea
          placeholder="Write something valuable..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="glass-input rounded-lg px-4 py-3 h-20 resize-none text-sm"
        />
        <button
          type="submit"
          className="btn-primary self-end px-6 py-2 rounded-lg text-sm"
        >
          Save Note
        </button>
      </form>

      {/* Notes grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
        <AnimatePresence>
          {notes.map((note, i) => {
            const colorSet = NOTE_COLORS[i % NOTE_COLORS.length]
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                whileHover={{ y: -3, transition: { duration: 0.15 } }}
                className="p-5 rounded-xl relative group flex flex-col"
                style={{ background: colorSet.bg, border: `1px solid ${colorSet.border}` }}
              >
                {/* Color dot */}
                <div className="w-2 h-2 rounded-full mb-3" style={{ background: colorSet.dot }} />
                <h4 className="text-white font-semibold mb-2 pr-6 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {note.title}
                </h4>
                <p className="text-slate-400 text-xs whitespace-pre-wrap flex-1 leading-relaxed line-clamp-4">
                  {note.content}
                </p>
                
                {/* Expand Button */}
                <button
                  onClick={() => setSelectedNote(note)}
                  className="mt-3 text-left text-[10px] uppercase tracking-wider font-bold text-slate-500 hover:text-white transition-colors"
                >
                  Open Note →
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                >
                  ✕
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {notes.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-slate-600 text-sm italic">
            <p className="text-3xl mb-3">📭</p>
            <p>No notes saved yet. Start writing.</p>
          </div>
        )}
      </div>

      {/* Expanded Note Modal */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNote(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              layoutId={`note-${selectedNote.id}`}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] h-[80vh] flex flex-col rounded-2xl glass-card overflow-hidden"
              style={{ background: 'rgba(20,20,25,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/5 shrink-0">
                <input
                  type="text"
                  value={selectedNote.title}
                  onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
                  className="bg-transparent border-none outline-none text-lg font-bold text-white w-full mr-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  placeholder="Note Title..."
                />
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      fetch(``${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}`/api/notes/${selectedNote.id}`, {
                        method: `PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: selectedNote.title, content: selectedNote.content })
                      }).then(() => {
                        loadNotes();
                        setSelectedNote(null);
                      });
                    }}
                    className="btn-primary text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      deleteNote(selectedNote.id);
                      setSelectedNote(null);
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-red-400 uppercase tracking-wider px-2 py-1"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Modal Content */}
              <div className="p-6 overflow-y-auto flex-1 flex flex-col">
                <textarea
                  value={selectedNote.content}
                  onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                  className="bg-transparent border-none outline-none text-slate-300 text-sm leading-relaxed flex-1 resize-none w-full h-full"
                  placeholder="Write something valuable..."
                />
              </div>
              
              {/* Modal Footer */}
              <div className="p-4 border-t border-white/5 shrink-0 bg-white/[0.02] flex justify-between px-6">
                <p className="text-[10px] text-slate-500 font-mono">
                  Created: {new Date(selectedNote.created_at).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  Updated: {selectedNote.updated_at ? new Date(selectedNote.updated_at).toLocaleString() : 'Never'}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotesManager
