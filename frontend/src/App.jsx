import { useState, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TodoList from './components/TodoList'
import SubjectManager from './components/SubjectManager'
import TimetableManager from './components/TimetableManager'
import AiParser from './components/AiParser'
import Analytics from './components/Analytics'
import ResearchBot from './components/ResearchBot.jsx'
import NotesManager from './components/NotesManager'
import EscapePlan from './components/EscapePlan'
import AttendanceHistory from './components/AttendanceHistory'
import Blobs from './components/effects/Blobs'
import './App.css'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tasks & Chores', icon: '⚡', color: 'blue' },
  { id: 'timetable', label: 'Timetable', icon: '📅', color: 'emerald' },
  { id: 'attendance', label: 'Attendance', icon: '📊', color: 'purple' },
  { id: 'ai-parser', label: 'AI Auto-Parse', icon: '🤖', color: 'violet' },
  { id: 'analytics', label: 'Analytics', icon: '📈', color: 'amber' },
  { id: 'research', label: 'Deep Research', icon: '🧠', color: 'cyan' },
  { id: 'notes', label: 'Notes Vault', icon: '📝', color: 'blue' },
]

const TAB_COLORS = {
  blue:    { active: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',    dot: 'bg-blue-400' },
  emerald: { active: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30', dot: 'bg-emerald-400' },
  purple:  { active: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',  dot: 'bg-purple-400' },
  violet:  { active: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',  dot: 'bg-violet-400' },
  amber:   { active: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',   dot: 'bg-amber-400' },
  cyan:    { active: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',    dot: 'bg-cyan-400' },
}

const pageVariants = {
  initial: { opacity: 0, y: 16, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
  exit:    { opacity: 0, y: -8, filter: 'blur(4px)', transition: { duration: 0.15 } }
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setIsMobileMenuOpen(false)
  }

  const activeItem = NAV_ITEMS.find(n => n.id === activeTab)

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#050508' }}>

      {/* ── CSS AURORA BACKGROUND ── */}
      <div className="aurora-bg">
        <div className="aurora-spot" />
      </div>

      {/* ── BLOB ORBS (depth layer) ── */}
      <Blobs count={4} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <motion.aside
        initial={false}
        className={`glass-sidebar fixed md:static inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-300 ease-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Logo */}
          <div className="p-6 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <h1 className="text-xl font-bold gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Noicee OS
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">RTU Academic Tracker</p>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              ✕
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id
              const colorSet = TAB_COLORS[item.color]
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabSwitch(item.id)}
                  className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left ${
                    isActive ? colorSet.active : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 35 }}
                    />
                  )}
                  <span className="text-base relative z-10">{item.icon}</span>
                  <span className="relative z-10">{item.label}</span>
                  {isActive && (
                    <span className={`ml-auto w-1.5 h-1.5 rounded-full ${colorSet.dot} relative z-10`} />
                  )}
                </button>
              )
            })}
          </nav>

          {/* User */}
          <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', boxShadow: '0 0 12px rgba(99,102,241,0.4)' }}
              >
                M
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Mayank Teli</p>
                <p className="text-xs text-slate-500">Admin Account</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col overflow-hidden" style={{ position: 'relative', zIndex: 2 }}>

        {/* Header */}
        <header className="glass-header h-16 flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden btn-ghost p-2 rounded-lg text-slate-400"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeItem?.icon}</span>
              <h2 className="text-base font-semibold text-white capitalize" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {activeItem?.label}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500 font-medium hidden sm:block">Live</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {activeTab === 'dashboard'  && <TodoList />}
                {activeTab === 'timetable' && <TimetableManager />}
                {activeTab === 'attendance' && (
                  <div className="space-y-6">
                    <EscapePlan />
                    <SubjectManager />
                    <AttendanceHistory />
                  </div>
                )}
                {activeTab === 'ai-parser'  && <AiParser />}
                {activeTab === 'analytics'  && <Analytics />}
                {activeTab === 'research'   && <ResearchBot />}
                {activeTab === 'notes'      && <NotesManager />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
