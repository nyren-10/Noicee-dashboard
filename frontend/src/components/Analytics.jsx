import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
        <p className="text-slate-300 mb-1">{payload[0]?.payload?.fullName || label}</p>
        <p style={{ color: payload[0].value < 75 ? '#f87171' : '#34d399' }}>
          {payload[0].value}% attendance
        </p>
      </div>
    )
  }
  return null
}

function Analytics() {
  const [tasks, setTasks] = useState([])
  const [subjects, setSubjects] = useState([])
  const [aiData, setAiData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatQuery, setChatQuery] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [isChatting, setIsChatting] = useState(false)

  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/tasks').then(res => res.json()).then(data => setTasks(data))
    fetch('http://127.0.0.1:5000/api/subjects').then(res => res.json()).then(data => setSubjects(data))
  }, [])

  const generateReport = () => {
    setIsGenerating(true)
    fetch('http://127.0.0.1:5000/api/ai-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks, subjects })
    }).then(res => res.json()).then(data => { setAiData(data); setIsGenerating(false) })
  }

  const handleDataChat = (e) => {
    e.preventDefault()
    if (!chatQuery.trim()) return
    const currentQuery = chatQuery
    setChatHistory(prev => [...prev, { role: 'user', text: currentQuery }])
    setChatQuery('')
    setIsChatting(true)

    fetch('http://127.0.0.1:5000/api/analytics-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: currentQuery, tasks, subjects })
    }).then(res => res.json()).then(data => {
      setChatHistory(prev => [...prev, { role: 'ai', text: data.response || "Error" }])
      setIsChatting(false)
    })
  }

  const formatName = (name) => {
    if (!name) return ''
    if (name.includes('/')) return name.split('/')[0]
    const words = name.split(' ')
    if (words.length > 1) return words.map(w => w[0]).join('').toUpperCase()
    return name.length > 10 ? name.substring(0, 10) + '..' : name
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.is_completed).length
  const taskProgress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)

  const validSubjects = subjects.filter(s => s.name && s.name.trim() !== '')
  const totalClassesMissed = validSubjects.reduce((acc, s) => acc + (s.total_classes - s.attended), 0)

  const chartData = validSubjects.map(s => ({
    name: formatName(s.name),
    fullName: s.name,
    Attendance: s.total_classes > 0 ? Math.round((s.attended / s.total_classes) * 100) : 100,
  }))

  const overallAttendance = chartData.length > 0
    ? Math.round(chartData.reduce((acc, curr) => acc + curr.Attendance, 0) / chartData.length)
    : 100

  const statCards = [
    { label: 'Overall', value: `${overallAttendance}%`, color: overallAttendance >= 75 ? '#34d399' : '#f87171', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    { label: 'Tasks Done', value: `${taskProgress}%`, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
    { label: 'Bunks Taken', value: totalClassesMissed, color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  ]

  return (
    <div className="space-y-6" id="printable-report">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Analytics Engine</h2>
        <button
          onClick={() => window.print()}
          className="btn-ghost px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          🖨️ Export PDF
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
      {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="p-5 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
          >
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-1 sm:mb-2 text-center">{stat.label}</p>
            <p className="text-2xl sm:text-4xl font-black" style={{ color: stat.color, fontFamily: "'Space Grotesk', sans-serif" }}>
              {stat.value}
            </p>
          </motion.div>
        ))}

        {/* Generate Insights Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="col-span-2 lg:col-span-1 p-5 rounded-2xl flex flex-col justify-center items-center print:hidden"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
        >
          <button
            onClick={generateReport}
            disabled={isGenerating}
            className="w-full h-full min-h-[3rem] rounded-xl text-sm font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white', boxShadow: '0 4px 15px rgba(168,85,247,0.3)' }}
          >
            {isGenerating ? (
              <span className="flex items-center gap-2 justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Crunching...
              </span>
            ) : 'Generate Insights'}
          </button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 min-h-[300px] flex flex-col"
        >
          <h3 className="text-base font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Subject Breakdown
          </h3>
          <div className="flex-1 w-full" style={{ minHeight: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#475569" fontSize={11} interval={0} />
                <YAxis stroke="#475569" fontSize={12} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} />
                <Bar dataKey="Attendance" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.Attendance < 75 ? 'url(#dangerGrad)' : 'url(#safeGrad)'}
                    />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="safeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6 flex flex-col"
        >
          <h3 className="text-base font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Agent Diagnostics
          </h3>
          <AnimatePresence mode="wait">
            {aiData && !aiData.error ? (
              <motion.div
                key="insights"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3 flex-1"
              >
                <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <p className="text-emerald-400 text-sm font-medium">{aiData.vibe_check}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <p className="text-amber-400 text-sm font-medium">{aiData.critical_warning}</p>
                </div>
                <div className="p-4 rounded-xl flex-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Action Plan</p>
                  <ul className="space-y-2">
                    {aiData.action_items?.map((item, idx) => (
                      <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex items-center justify-center rounded-xl"
                style={{ border: '2px dashed rgba(255,255,255,0.07)' }}
              >
                <p className="text-slate-600 text-sm italic">Waiting for analysis...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Data Chatbot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-6 print:hidden"
      >
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <span className="text-blue-400">🤖</span> Ask Your Data
        </h3>
        <div className="rounded-xl h-48 overflow-y-auto p-4 mb-4 space-y-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {chatHistory.length === 0 && (
            <p className="text-slate-600 text-sm italic">e.g. "How many classes do I need to attend to hit 75% in OOPS?"</p>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`p-3 rounded-xl text-sm max-w-[80%] ${msg.role === 'user' ? 'ml-auto text-right' : ''}`}
              style={{
                background: msg.role === 'user' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.05)',
                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                color: msg.role === 'user' ? 'white' : '#cbd5e1'
              }}
            >
              {msg.text}
            </div>
          ))}
          {isChatting && <div className="text-slate-500 text-sm animate-pulse">Calculating...</div>}
        </div>
        <form onSubmit={handleDataChat} className="flex gap-2">
          <input
            type="text"
            value={chatQuery}
            onChange={e => setChatQuery(e.target.value)}
            placeholder="Interrogate your attendance..."
            className="glass-input flex-1 rounded-xl px-4 py-2.5 text-sm"
          />
          <button type="submit" disabled={isChatting} className="btn-primary px-5 py-2.5 rounded-xl text-sm disabled:opacity-50">
            Ask
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default Analytics