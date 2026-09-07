import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

function AiParser() {
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const handleUpload = (file) => {
    if (!file) return
    setIsParsing(true)
    setResult(null)

    const formData = new FormData()
    formData.append('image', file)
    formData.append('custom_prompt', customPrompt)

    fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:5000"}/api/parse-timetable`, {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        setResult({ success: !data.error, message: data.message || data.error })
        setIsParsing(false)
      })
      .catch(() => {
        setResult({ success: false, message: "Failed to connect to the brain. Is Flask running?" })
        setIsParsing(false)
      })
  }

  const handleFileInput = (e) => handleUpload(e.target.files[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleUpload(file)
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="glass-card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-3xl"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            🤖
          </div>
          <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            AI Timetable Parser
          </h3>
          <p className="text-slate-400 text-sm">Drop your RTU timetable image and let Gemini extract the full schedule</p>
        </div>

        {/* Custom prompt */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
            Custom Instructions (optional)
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. 'Extract Section B instead of Section A'"
            className="glass-input w-full rounded-xl px-4 py-3 text-sm resize-none h-20"
          />
        </div>

        {/* Drop zone */}
        <label
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center w-full h-40 rounded-xl cursor-pointer transition-all relative overflow-hidden"
          style={{
            border: `2px dashed ${isDragOver ? 'rgba(139,92,246,0.6)' : isParsing ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.25)'}`,
            background: isDragOver ? 'rgba(139,92,246,0.1)' : isParsing ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.04)'
          }}
        >
          <AnimatePresence mode="wait">
            {isParsing ? (
              <motion.div
                key="parsing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <div className="w-12 h-12 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin mb-3" />
                <p className="text-violet-400 font-semibold text-sm">Gemini is parsing...</p>
                <p className="text-slate-600 text-xs mt-1">This may take a few seconds</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <span className="text-3xl mb-3">{isDragOver ? '📂' : '📸'}</span>
                <p className="text-violet-400 font-semibold text-sm">
                  {isDragOver ? 'Drop to parse' : 'Click to upload or drag & drop'}
                </p>
                <p className="text-slate-600 text-xs mt-1">PNG or JPG — starts parsing immediately</p>
              </motion.div>
            )}
          </AnimatePresence>
          <input
            type="file"
            className="hidden"
            accept="image/png, image/jpeg"
            onChange={handleFileInput}
            disabled={isParsing}
          />
        </label>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 rounded-xl flex items-start gap-3"
              style={{
                background: result.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${result.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}
            >
              <span className="text-xl">{result.success ? '✅' : '❌'}</span>
              <p className={`text-sm font-medium ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default AiParser
