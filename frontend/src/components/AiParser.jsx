import { useState } from 'react'

function AiParser() {
  const [isParsing, setIsParsing] = useState(false)
  const [result, setResult] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')

  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsParsing(true)
    setResult(null)

    const formData = new FormData()
    formData.append('image', file)
    // Send your custom instructions to the backend
    formData.append('custom_prompt', customPrompt)

    fetch('http://127.0.0.1:5000/api/parse-timetable', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      setResult(data.message || data.error)
      setIsParsing(false)
    })
    .catch(err => {
      setResult("Failed to connect to the brain. Is Flask running?")
      setIsParsing(false)
    })
  }

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl text-center">
        <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700 text-3xl">
          🤖
        </div>
        <h3 className="text-2xl font-heading font-bold text-white mb-2">Upload Schedule Image</h3>
        <p className="text-gray-400 mb-6">Drop your messy RTU timetable PNG here and let the AI extract it.</p>
        
        {/* The new prompt box */}
        <textarea 
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Custom instructions (e.g., 'Extract the teacher name and put it in the notes field')"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 mb-6 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all resize-none h-24"
        />

        <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all relative overflow-hidden ${isParsing ? 'border-purple-500 bg-purple-500/10' : 'border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer group'}`}>
          {isParsing ? (
            <div className="flex flex-col items-center justify-center animate-pulse">
              <span className="text-4xl mb-2">🧠</span>
              <p className="text-purple-400 font-semibold">Gemini is thinking...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <p className="mb-2 text-lg text-purple-400 group-hover:text-purple-300 font-semibold">Click to upload image</p>
              <p className="text-sm text-gray-500">Starts parsing immediately</p>
            </div>
          )}
          <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleUpload} disabled={isParsing} />
        </label>

        {result && (
          <div className="mt-8 text-left bg-gray-900 p-4 rounded-xl border border-gray-700">
            <p className="text-emerald-400 font-medium">{result}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AiParser