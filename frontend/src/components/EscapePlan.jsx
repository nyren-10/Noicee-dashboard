import { useState } from 'react';

export default function EscapePlan() {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/bunk-runway');
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error("Matrix failure:", error);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-gray-900 border border-purple-500 rounded-xl p-6 mb-8 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
      
      {/* THE FIX: Stack on mobile (flex-col), side-by-side on desktop (sm:flex-row) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🚀 Comprehensive Bunk Report
          </h2>
          <p className="text-gray-400 text-sm mt-1">Predictive matrix & subject buffers</p>
        </div>
        <button 
          onClick={generateReport}
          disabled={isLoading}
          // Made the button full width on mobile so it doesn't look awkward
          className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
        >
          {isLoading ? "Running Simulation..." : "Execute Analytics"}
        </button>
      </div>

      {report ? (
        <div className="space-y-6 animate-fade-in">
          {/* CONSECUTIVE DAYS WARNING */}
          <div className={`p-4 rounded-lg border-l-4 ${report.days_skipped > 0 ? 'bg-gray-800 border-green-500' : 'bg-red-900/30 border-red-500'}`}>
            <h3 className="text-xl font-bold text-white mb-1">
              Consecutive Vanish Limit: {report.days_skipped} Days
            </h3>
            {report.days_skipped === 0 ? (
              <p className="text-red-400 font-medium">⚠️ Critical: Bunking tomorrow instantly drops {report.killer_subject} below 75%.</p>
            ) : report.days_skipped === 30 ? (
              <p className="text-green-400 font-medium">God Mode: You are safe for a month.</p>
            ) : (
              <p className="text-amber-400 font-medium">
                ⚠️ You must return on {report.target_date} or you fail {report.killer_subject}.
              </p>
            )}
          </div>

          {/* THE BUNK BANK GRID */}
          <div>
            <h3 className="text-lg font-bold text-white mb-3 border-b border-gray-800 pb-2">The Bunk Bank (Buffer Limits)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.bunk_bank.map((sub, index) => (
                <div key={index} className="bg-gray-800 p-4 rounded-lg flex flex-col">
                  <span className="text-gray-300 font-medium truncate">{sub.name}</span>
                  <div className="flex justify-between items-end mt-2">
                    <span className="text-2xl font-bold text-white">{sub.percentage}%</span>
                    <span className={`text-lg font-bold px-3 py-1 rounded-md ${sub.safe_bunks > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {sub.safe_bunks > 0 ? `+${sub.safe_bunks} Safe` : `${sub.safe_bunks} Owed`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg">
          <p className="text-gray-500 italic">Hit the button to calculate your exact bunk margins.</p>
        </div>
      )}
    </div>
  );
}