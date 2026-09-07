import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function AttendanceHistory() {
  const [logs, setLogs] = useState([])
  const [syncStatus, setSyncStatus] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'PRESENT' | 'ABSENT'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logsRes, statusRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/attendance-log?limit=60`),
          fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/sync-status`)
        ])
        const logsData = await logsRes.json()
        const statusData = await statusRes.json()
        setLogs(Array.isArray(logsData) ? logsData : [])
        setSyncStatus(statusData)
      } catch (err) {
        console.error('Failed to fetch attendance history:', err)
      }
      setIsLoading(false)
    }

    fetchData()

    window.addEventListener('attendance-updated', fetchData)
    return () => window.removeEventListener('attendance-updated', fetchData)
  }, [])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatTime = (isoStr) => {
    if (!isoStr) return '—'
    const d = new Date(isoStr)
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const formatSyncTime = (isoStr) => {
    if (!isoStr) return 'Never'
    const d = new Date(isoStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    if (diffMins < 2) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return formatDate(isoStr)
  }

  const getSyncStatusColor = (status) => {
    if (status === 'success') return 'text-emerald-400'
    if (status === 'error') return 'text-red-400'
    if (status === 'never') return 'text-slate-500'
    return 'text-amber-400'
  }

  const getSyncStatusLabel = (status) => {
    const labels = {
      success: 'Synced',
      error: 'Sync Error',
      never: 'Not Yet Synced',
      no_email: 'No Email Found',
      no_credentials: 'Missing Credentials',
      no_html: 'Email Parse Failed',
    }
    return labels[status] || status
  }

  const filteredLogs = logs.filter(log => filter === 'all' || log.status === filter)

  // Group logs by date
  const grouped = filteredLogs.reduce((acc, log) => {
    const key = log.log_date || 'Unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})
  const groupedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
            🗓️
          </div>
          <div>
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Attendance History
            </h2>
            <p className="text-xs text-slate-500">{logs.length} records logged</p>
          </div>
        </div>

        {/* Sync Status Pill */}
        {syncStatus && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className={`w-2 h-2 rounded-full ${syncStatus.status === 'success' ? 'bg-emerald-400 animate-pulse' : syncStatus.status === 'error' ? 'bg-red-400' : 'bg-slate-500'}`} />
            <span className="text-slate-400">Last sync:</span>
            <span className={`font-semibold ${getSyncStatusColor(syncStatus.status)}`}>
              {formatSyncTime(syncStatus.last_sync_at)}
            </span>
            {syncStatus.status !== 'success' && syncStatus.status !== 'never' && (
              <span className="badge-danger px-1.5 py-0.5 rounded text-xs">
                {getSyncStatusLabel(syncStatus.status)}
              </span>
            )}
            <span className="text-slate-600">·</span>
            <span className="text-slate-500">Auto-syncs at 7 PM IST</span>
          </div>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 mb-6">
        {['all', 'PRESENT', 'ABSENT'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === f
                ? f === 'PRESENT' ? 'badge-success' : f === 'ABSENT' ? 'badge-danger' : 'badge-neutral'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            style={{ background: filter === f ? undefined : 'rgba(255,255,255,0.04)' }}
          >
            {f === 'all' ? 'All' : f === 'PRESENT' ? '✓ Present' : '✗ Absent'}
          </button>
        ))}
      </div>

      {/* Log feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-400 font-medium">No attendance records yet</p>
          <p className="text-slate-600 text-sm mt-1">Records appear after the auto-sync runs (7 PM IST) or when you mark attendance manually above.</p>
        </div>
      ) : (
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
          <AnimatePresence>
            {groupedDates.map((date, di) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: di * 0.04 }}
              >
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {formatDate(date)}
                  </span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-xs text-slate-600">{grouped[date].length} classes</span>
                </div>

                {/* Entries for this date */}
                <div className="space-y-2 ml-1">
                  {grouped[date].map((log, i) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${log.status === 'PRESENT' ? 'bg-emerald-400' : 'bg-red-400'}`} />

                      {/* Subject name */}
                      <span className="flex-1 text-sm font-medium text-slate-200 truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {log.subject_name}
                      </span>

                      {/* Status badge */}
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${log.status === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>
                        {log.status === 'PRESENT' ? '✓ Present' : '✗ Absent'}
                      </span>

                      {/* Source badge */}
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${log.source === 'MANUAL' ? 'badge-purple' : 'badge-cyan'}`}>
                        {log.source === 'MANUAL' ? 'Manual' : 'Auto'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default AttendanceHistory
