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

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Survival System
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            📋 Tasks & Chores
          </button>
          
          <button 
            onClick={() => setActiveTab('timetable')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'timetable' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            📅 Timetable
          </button>

          <button 
            onClick={() => setActiveTab('attendance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            📊 Attendance
          </button>

          <button 
            onClick={() => setActiveTab('ai-parser')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'ai-parser' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-purple-400'}`}
          >
            🤖 AI Auto-Parse
          </button>

          {/* New Analytics Button */}
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'analytics' ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-amber-400'}`}
          >
            📈 Analytics
          </button>

          {/* New Research Bot Button */}
          <button 
            onClick={() => setActiveTab('research')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'research' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-cyan-400'}`}
          >
            🧠 Deep Research
          </button>
          
          <button 
            onClick={() => setActiveTab('notes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeTab === 'notes' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            📝 Notes Vault
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
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
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-8">
          <h2 className="text-xl font-semibold text-white capitalize font-heading">
            {activeTab.replace('-', ' ')}
          </h2>
          <div className="text-sm text-gray-400 font-medium">
            RTU Academic Tracker
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* USE CSS HIDING INSTEAD OF UNMOUNTING */}
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