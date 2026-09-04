import { useState } from 'react'

function ResearchBot() {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleResearch = (e) => {
    e.preventDefault()
    if (!query.trim()) return

    const userQuery = query
    setHistory(prev => [...prev, { role: 'user', text: userQuery }])
    setQuery('')
    setIsLoading(true)

    fetch('http://127.0.0.1:5000/api/research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: userQuery })
    })
    .then(res => res.json())
    .then(data => {
      setHistory(prev => [...prev, { role: 'ai', text: data.response || data.error }])
      setIsLoading(false)
    })
    .catch(() => {
      setHistory(prev => [...prev, { role: 'ai', text: "Connection failed." }])
      setIsLoading(false)
    })
  }

  return (
    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl h-[80vh] flex flex-col">
      <h2 className="text-xl font-heading font-bold text-white mb-6 flex items-center gap-2">
        <span className="text-cyan-400">🧠</span> Deep Research Console
      </h2>
      
      <div className="flex-1 overflow-y-auto mb-6 space-y-4 pr-2">
        {history.length === 0 && (
          <div className="text-center text-gray-500 italic mt-20">Enter a topic to generate a structured research report.</div>
        )}
        {history.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-900 text-gray-200 border border-gray-700'}`}>
              <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-900 p-4 rounded-2xl border border-gray-700 text-cyan-400 animate-pulse text-sm">
              Synthesizing data...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleResearch} className="flex flex-col sm:flex-row gap-3">
        <input 
          type="text" 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
          placeholder="Ask a deep technical question..." 
          className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500"
        />
        <button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white px-6 py-3 rounded-xl font-medium transition-colors">
          Research
        </button>
      </form>
    </div>
  )
}

export default ResearchBot