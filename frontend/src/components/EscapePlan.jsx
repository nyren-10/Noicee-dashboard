import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function EscapePlan() {
  const [report, setReport] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const generateReport = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/bunk-runway')
      const data = await response.json()
      setReport(data)
    } catch (error) {
      console.error("Matrix failure:", error)
    }
    setIsLoading(false)
  }

  return (
    <div className="glass-card p-6" style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
            🚀
          </div>
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Bunk Runway
            </h2>
            <p className="text-xs text-slate-500">Predictive matrix & safe limits</p>
          </div>
        </div>
        <button
          onClick={generateReport}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 15px rgba(168,85,247,0.3)', color: 'white' }}
        >
          {isLoading ? (
            <span className="flex items-center gap-2 justify-center">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Simulating...
            </span>
          ) : 'Execute Analytics'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {report ? (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* Vanish Limit Banner */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: report.days_skipped > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${report.days_skipped > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black" style={{ color: report.days_skipped > 0 ? '#34d399' : '#f87171' }}>
                  {report.days_skipped === 30 ? '∞' : report.days_skipped}
                </span>
                <div>
                  <p className="text-white font-semibold">
                    {report.days_skipped === 30 ? 'God Mode — Safe for a month' : `Consecutive bunk day${report.days_skipped !== 1 ? 's' : ''} allowed`}
                  </p>
                  {report.days_skipped === 0 ? (
                    <p className="text-red-400 text-sm">⚠️ Bunking tomorrow drops {report.killer_subject} below 75%</p>
                  ) : report.days_skipped < 30 ? (
                    <p className="text-amber-400 text-sm">Must return by {report.target_date} or {report.killer_subject} fails</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Bunk Bank Grid */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Buffer Limits per Subject</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.bunk_bank.map((sub, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.06 }}
                    className="p-4 rounded-xl flex flex-col"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <span className="text-slate-300 text-sm font-medium truncate mb-2">{sub.name}</span>
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-black text-white">{sub.percentage}%</span>
                      <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${sub.safe_bunks > 0 ? 'badge-success' : 'badge-danger'}`}>
                        {sub.safe_bunks > 0 ? `+${sub.safe_bunks} safe` : `${sub.safe_bunks} owed`}
                      </span>
                    </div>
                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(sub.percentage, 100)}%`,
                          background: sub.percentage >= 75 ? 'linear-gradient(90deg, #059669, #10b981)' : 'linear-gradient(90deg, #dc2626, #f97316)'
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-28 flex items-center justify-center rounded-xl"
            style={{ border: '2px dashed rgba(255,255,255,0.08)' }}
          >
            <p className="text-slate-600 italic text-sm">Hit Execute to calculate your exact bunk margins.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
