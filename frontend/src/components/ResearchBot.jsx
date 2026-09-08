import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function ResearchBot() {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('research_chat_history') || '[]')
    } catch {
      return []
    }
  })
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem('research_chat_history', JSON.stringify(history))
    } catch (e) {
      console.error("Failed to save chat history", e)
    }
  }, [history])

  const clearChat = () => {
    setHistory([])
    localStorage.removeItem('research_chat_history')
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, isLoading])

  const executeResearch = async (userQuery, retryCount = 0) => {
    setIsLoading(true)
    const apiUrl = `${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/research`

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery })
      })

      let data = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (!res.ok) {
        // If server is returning a cold-start gateway error (502, 503, 504) and we haven't retried yet, retry once
        if ((res.status === 502 || res.status === 503 || res.status === 504) && retryCount < 2) {
          await new Promise(r => setTimeout(r, 2500))
          return executeResearch(userQuery, retryCount + 1)
        }
        throw new Error(data?.error || `Server responded with status ${res.status}`)
      }

      setHistory(prev => [...prev, { role: 'ai', text: data.response || "No response received." }])
      setIsLoading(false)
    } catch (err) {
      if (retryCount < 2) {
        // Retry once on network drop / cold boot
        await new Promise(r => setTimeout(r, 2500))
        return executeResearch(userQuery, retryCount + 1)
      }
      setHistory(prev => [...prev, { 
        role: 'ai', 
        text: `Error: ${err.message || "Connection failed. The backend server might be waking up (Render cold start). Please try again in a few seconds."}` 
      }])
      setIsLoading(false)
    }
  }

  const handleResearch = (e) => {
    e.preventDefault()
    if (!query.trim() || isLoading) return

    const userQuery = query.trim()
    setHistory(prev => [...prev, { role: 'user', text: userQuery }])
    setQuery('')
    executeResearch(userQuery, 0)
  }

  return (
    <div className="glass-card p-6 flex flex-col" style={{ height: '80vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
            🧠
          </div>
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Deep Research Console</h2>
            <p className="text-xs text-slate-500">Gemini-powered explanations</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs font-medium text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-xl border border-slate-700/60 hover:border-red-500/40 transition-all flex items-center gap-1.5"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <span>🗑️</span> Clear Chat
          </button>
        )}
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-1">
        {history.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-4xl mb-3">🔬</p>
              <p className="text-slate-500 text-sm">Ask anything — DSA, OOPS, AEM, DE...</p>
            </div>
          </div>
        )}
        <AnimatePresence>
          {history.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed"
                style={{
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #0e7490, #06b6d4)'
                    : 'rgba(255,255,255,0.05)',
                  border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.09)',
                  color: msg.role === 'user' ? 'white' : '#cbd5e1'
                }}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap font-sans">{msg.text}</p>
                ) : (
                  <div className="markdown-content text-slate-200 leading-relaxed space-y-2">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-base font-bold text-white mt-3 mb-1" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-sm font-bold text-cyan-300 mt-3 mb-1" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mt-2.5 mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2 leading-relaxed text-slate-200" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 my-2 ml-1 text-slate-300" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 my-2 ml-1 text-slate-300" {...props} />,
                        li: ({node, ...props}) => <li className="text-slate-300" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                        code: ({node, inline, className, children, ...props}) => {
                          return inline ? (
                            <code className="px-1.5 py-0.5 rounded bg-black/40 text-cyan-300 font-mono text-xs border border-cyan-500/20" {...props}>
                              {children}
                            </code>
                          ) : (
                            <pre className="p-3 my-2 rounded-xl bg-black/60 border border-slate-700/50 overflow-x-auto text-xs font-mono text-cyan-200">
                              <code {...props}>{children}</code>
                            </pre>
                          )
                        }
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="p-4 rounded-2xl text-sm flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
              <span className="text-cyan-400">Synthesizing data...</span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleResearch} className="flex flex-col sm:flex-row gap-3 shrink-0">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ask a deep technical question..."
          className="glass-input flex-1 rounded-xl px-4 py-3 text-sm"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
          style={{ background: 'linear-gradient(135deg, #0e7490, #06b6d4)', color: 'white', boxShadow: '0 4px 15px rgba(6,182,212,0.25)' }}
        >
          Research
        </button>
      </form>
    </div>
  )
}

export default ResearchBot
