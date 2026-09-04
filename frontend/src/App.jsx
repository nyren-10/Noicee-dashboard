import { useState } from 'react'
import TodoList from './components/TodoList'
import SubjectManager from './components/SubjectManager'
import TimetableManager from './components/TimetableManager'
import AiParser from './components/AiParser'
import Analytics from './components/Analytics'
import ResearchBot from './components/ResearchBot.jsx'
import NotesManager from './components/NotesManager'  
import EscapePlan from './components/EscapePlan'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  // New state to track if the mobile sidebar is open
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Wrapper function so when you click a button on mobile, the menu actually closes
  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      
      {/* Mobile Dark Overlay (closes menu when you tap outside of it) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Slide-out on mobile, fixed on desktop */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Survival System
          </h1>
          {/* Mobile Close Button */}
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => handleTabSwitch('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            📋 Tasks & Chores
          </button>
          
          <button 
            onClick={() => handleTabSwitch('timetable')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'timetable' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            📅 Timetable
          </button>

          <button 
            onClick={() => handleTabSwitch('attendance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            📊 Attendance
          </button>

          <button 
            onClick={() => handleTabSwitch('ai-parser')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'ai-parser' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-purple-400'}`}
          >
            🤖 AI Auto-Parse
          </button>

          <button 
            onClick={() => handleTabSwitch('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'analytics' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-amber-400'}`}
          >
            📈 Analytics
          </button>

          <button 
            onClick={() => handleTabSwitch('research')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'research' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-cyan-400'}`}
          >
            🧠 Deep Research
          </button>
          
          <button 
            onClick={() => handleTabSwitch('notes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'notes' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            📝 Notes Vault
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800 bg-gray-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center font-bold text-white shadow-lg">
              M
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Mayank Teli</p>
              <p className="text-xs text-gray-500">Admin Account</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3 md:gap-0">
            {/* Hamburger Button (Mobile Only) */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg bg-gray-800"
            >
              ☰
            </button>
            <h2 className="text-xl font-semibold text-white capitalize font-heading">
              {activeTab.replace('-', ' ')}
            </h2>
          </div>
          <div className="text-sm text-gray-400 font-medium hidden sm:block">
            RTU Academic Tracker
          </div>
        </header>

        {/* Adjusted padding for mobile screens */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto pb-10">
            
            <div className={activeTab === 'dashboard' ? 'block animate-fade-in' : 'hidden'}>
              <TodoList />
            </div>
            
            <div className={activeTab === 'timetable' ? 'block animate-fade-in' : 'hidden'}>
              <TimetableManager />
            </div>
            
            <div className={activeTab === 'attendance' ? 'block animate-fade-in' : 'hidden'}>
              <EscapePlan />
              <SubjectManager />
            </div>
            
            <div className={activeTab === 'ai-parser' ? 'block animate-fade-in' : 'hidden'}>
              <AiParser />
            </div>
            
            <div className={activeTab === 'analytics' ? 'block animate-fade-in' : 'hidden'}>
              <Analytics />
            </div>
            
            <div className={activeTab === 'research' ? 'block animate-fade-in' : 'hidden'}>
              <ResearchBot />
            </div>
            
            <div className={activeTab === 'notes' ? 'block animate-fade-in' : 'hidden'}>
              <NotesManager />
            </div>

          </div>
        </div>
      </main>

    </div>
  )
}

export default App