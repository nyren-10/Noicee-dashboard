import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

function Analytics() {
  const [tasks, setTasks] = useState([])
  const [subjects, setSubjects] = useState([])
  const [aiData, setAiData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Data-Chatbot State
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
    const currentQuery = chatQuery;
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

  // Algorithm to shrink long subject names for the chart
  const formatName = (name) => {
    if (!name) return ''
    if (name.includes('/')) return name.split('/')[0] // Sports/Library -> Sports
    const words = name.split(' ')
    if (words.length > 1) return words.map(w => w[0]).join('').toUpperCase() // Operating System -> OS
    return name.length > 10 ? name.substring(0, 10) + '..' : name
  }

  // --- HARD DATA MATH ---
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

  const overallAttendance = chartData.length > 0 ? Math.round(chartData.reduce((acc, curr) => acc + curr.Attendance, 0) / chartData.length) : 100

  return (
    <div className="space-y-6 print:m-0 print:p-0 print:text-black print:bg-white" id="printable-report">
      
      <div className="flex justify-between items-center print:hidden mb-4">
        <h2 className="text-2xl font-bold">Analytics Engine</h2>
        <button onClick={() => window.print()} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
          🖨️ Export PDF
        </button>
      </div>

      {/* TOP METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:grid-cols-4">
        <div className="bg-gray-800 print:bg-gray-100 p-6 rounded-2xl border border-gray-700 print:border-gray-300 flex flex-col items-center">
          <p className="text-gray-400 print:text-gray-600 text-sm font-bold uppercase">Overall</p>
          <p className={`text-4xl font-heading font-black mt-2 ${overallAttendance >= 75 ? 'text-emerald-400 print:text-emerald-600' : 'text-red-400 print:text-red-600'}`}>{overallAttendance}%</p>
        </div>
        <div className="bg-gray-800 print:bg-gray-100 p-6 rounded-2xl border border-gray-700 print:border-gray-300 flex flex-col items-center">
          <p className="text-gray-400 print:text-gray-600 text-sm font-bold uppercase">Tasks</p>
          <p className="text-4xl font-heading font-black text-amber-400 print:text-amber-600 mt-2">{taskProgress}%</p>
        </div>
        <div className="bg-gray-800 print:bg-gray-100 p-6 rounded-2xl border border-gray-700 print:border-gray-300 flex flex-col items-center">
          <p className="text-gray-400 print:text-gray-600 text-sm font-bold uppercase">Bunks</p>
          <p className="text-4xl font-heading font-black text-red-400 print:text-red-600 mt-2">{totalClassesMissed}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-2xl border border-purple-900/50 flex flex-col justify-center items-center relative print:hidden group">
          <button onClick={generateReport} disabled={isGenerating} className="relative z-10 bg-purple-600 hover:bg-purple-500 text-white px-4 py-3 rounded-xl font-bold w-full text-center">
            {isGenerating ? "Crunching..." : "Generate Insights"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-1 print:block">
        {/* THE CHART */}
        <div className="bg-gray-800 print:bg-gray-100 p-6 rounded-2xl border border-gray-700 print:border-gray-300 min-h-[300px] flex flex-col print:mb-6">
          <h3 className="text-lg font-heading font-bold text-white print:text-black mb-4">Subject Breakdown</h3>
          <div className="flex-1 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} interval={0} />
                <YAxis stroke="#9ca3af" fontSize={12} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#374151' }} contentStyle={{ backgroundColor: '#111827', color: '#fff' }} />
                <ReferenceLine y={75} stroke="#ef4444" strokeDasharray="3 3" />
                <Bar dataKey="Attendance" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.Attendance < 75 ? '#ef4444' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI INSIGHTS */}
        <div className="bg-gray-800 print:bg-gray-100 p-6 rounded-2xl border border-gray-700 print:border-gray-300 flex flex-col print:break-inside-avoid">
          <h3 className="text-lg font-heading font-bold text-white print:text-black mb-4">Agent Diagnostics</h3>
          {aiData && !aiData.error ? (
            <div className="space-y-4 flex-1">
              <div className="bg-gray-900 print:bg-white p-4 rounded-xl border border-gray-700 print:border-gray-200">
                <p className="text-emerald-400 print:text-emerald-700 font-medium text-sm">{aiData.vibe_check}</p>
              </div>
              <div className="bg-gray-900 print:bg-white p-4 rounded-xl border border-gray-700 print:border-gray-200">
                <p className="text-amber-400 print:text-amber-700 font-medium text-sm">{aiData.critical_warning}</p>
              </div>
              <div className="bg-gray-900 print:bg-white p-4 rounded-xl border border-gray-700 print:border-gray-200 flex-1">
                <p className="text-xs text-gray-500 font-bold mb-2">ACTION PLAN</p>
                <ul className="space-y-1">
                  {aiData.action_items?.map((item, idx) => (
                    <li key={idx} className="text-gray-300 print:text-gray-700 text-sm">- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-dashed border-gray-700 rounded-xl print:hidden text-gray-500 text-sm">
              Waiting for analysis...
            </div>
          )}
        </div>
      </div>

      {/* DATA CHATBOT (Hidden in print) */}
      <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl print:hidden">
        <h3 className="text-lg font-heading font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-blue-400">🤖</span> Ask Your Data
        </h3>
        <div className="bg-gray-900 rounded-xl border border-gray-700 h-48 overflow-y-auto p-4 mb-4 space-y-3">
          {chatHistory.length === 0 && <p className="text-gray-500 text-sm italic">e.g. "How many classes do I need to attend to hit 75% in OOPS?"</p>}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`p-3 rounded-lg text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-800 text-gray-300 border border-gray-700 mr-auto'}`}>
              {msg.text}
            </div>
          ))}
          {isChatting && <div className="text-gray-500 text-sm animate-pulse">Calculating...</div>}
        </div>
        <form onSubmit={handleDataChat} className="flex gap-2">
          <input type="text" value={chatQuery} onChange={e => setChatQuery(e.target.value)} placeholder="Interrogate your attendance..." className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500" />
          <button type="submit" disabled={isChatting} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold">Ask</button>
        </form>
      </div>

    </div>
  )
}

export default Analytics