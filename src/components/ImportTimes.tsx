import React, { useState } from 'react';

type SolveState = 'ok' | 'plus2' | 'dnf';

interface SolveRecord {
  id: string;
  time: number;
  scramble: string;
  timestamp: number;
  state: SolveState;
  ao5?: number | null;
  ao12?: number | null;
  inspectionTime?: number;
}

interface ImportTimesProps {
  theme: 'light' | 'dark';
  onImport?: (times: number[]) => void;
}

const ImportTimes: React.FC<ImportTimesProps> = ({ theme, onImport }) => {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [importInfo, setImportInfo] = useState('');

  // Average calculation function (copied from Timer component)
  const calculateAverage = (solves: SolveRecord[], count: number): number | null => {
    if (solves.length < count) return null;
    
    const recentSolves = solves.slice(0, count);
    const dnfCount = recentSolves.filter(solve => solve.state === 'dnf').length;
    
    if (dnfCount >= 2) return null;
    
    const actualTimes = recentSolves.map(solve => {
      if (solve.state === 'dnf') return Infinity;
      return solve.state === 'plus2' ? solve.time + 2000 : solve.time;
    });
    
    const sorted = [...actualTimes].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);
    const validTimes = trimmed.filter(time => time !== Infinity);
    
    if (validTimes.length === 0) return null;
    
    const sum = validTimes.reduce((acc, time) => acc + time, 0);
    return sum / validTimes.length;
  };

  const saveTimesToActiveSession = (times: number[]) => {
    if (times.length === 0) return;
    
    const currentTime = Date.now();
    const importedSolves: SolveRecord[] = times.map((time, index) => ({
      id: `imported-${currentTime}-${index}`,
      time: time,
      scramble: 'Imported solve',
      timestamp: currentTime - (index * 1000), // Space them 1 second apart
      state: 'ok' as SolveState
    }));
    
    // Load existing sessions
    const sessionsData = localStorage.getItem('zen-timer-sessions');
    if (sessionsData) {
      try {
        const sessionManager = JSON.parse(sessionsData);
        const activeSession = sessionManager.sessions.find((s: any) => s.id === sessionManager.activeSessionId);
        
        if (activeSession) {
          // Add imported solves to the active session (most recent first)
          const updatedSolves = [...importedSolves.reverse(), ...activeSession.solves];
          
          // Recalculate averages for all solves
          const solvesWithAverages = updatedSolves.map((solve, index) => {
            const historyAtTime = updatedSolves.slice(index);
            const ao5 = calculateAverage(historyAtTime, 5);
            const ao12 = calculateAverage(historyAtTime, 12);
            
            return {
              ...solve,
              ao5,
              ao12
            };
          });
          
          // Update the active session
          activeSession.solves = solvesWithAverages;
          sessionManager.lastUpdated = Date.now();
          
          // Save updated sessions back to localStorage
          localStorage.setItem('zen-timer-sessions', JSON.stringify(sessionManager));
          return;
        }
      } catch (error) {
        console.error('Failed to parse existing sessions:', error);
      }
    }
    
    // Fallback: save to legacy format for migration
    const legacyHistory = localStorage.getItem('zen-timer-history') || '[]';
    try {
      const existing = JSON.parse(legacyHistory);
      const updatedHistory = [...importedSolves.reverse(), ...existing];
      const historyWithAverages = updatedHistory.map((solve, index) => {
        const historyAtTime = updatedHistory.slice(index);
        const ao5 = calculateAverage(historyAtTime, 5);
        const ao12 = calculateAverage(historyAtTime, 12);
        
        return {
          ...solve,
          ao5,
          ao12
        };
      });
      localStorage.setItem('zen-timer-history', JSON.stringify(historyWithAverages));
    } catch (error) {
      console.error('Failed to update legacy history:', error);
    }
  };

  const themeVars = {
    '--bg-primary': theme === 'light' ? '#ffffff' : '#0f0f0f',
    '--bg-secondary': theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 15, 15, 0.95)',
    '--bg-tertiary': theme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 31, 31, 0.8)',
    '--text-primary': theme === 'light' ? '#000000' : '#ffffff',
    '--text-secondary': theme === 'light' ? '#666666' : '#a3a3a3',
    '--text-tertiary': theme === 'light' ? '#999999' : '#737373',
    '--border-light': theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
    '--border-medium': theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)',
    '--gray-100': theme === 'light' ? '#f5f5f5' : '#262626',
    '--hover-bg': theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
    '--hover-bg-strong': theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
  };

  const parseTimesFromText = (text: string): { times: number[], info: string } => {
    const times: number[] = [];
    let info = '';
    
    try {
      // Try to parse as JSON first (cubetimer format)
      const data = JSON.parse(text);
      
      let sessionCount = 0;
      // Extract times from all sessions
      for (const sessionKey in data) {
        if (sessionKey.startsWith('session') && Array.isArray(data[sessionKey])) {
          const sessionTimes = data[sessionKey];
          if (sessionTimes.length > 0) {
            sessionCount++;
            for (const solve of sessionTimes) {
              if (Array.isArray(solve) && solve.length >= 2 && Array.isArray(solve[0])) {
                // Format: [[[penalty, time], scramble, comment, timestamp], ...]
                const timeData = solve[0];
                if (timeData.length >= 2 && typeof timeData[1] === 'number') {
                  times.push(timeData[1]); // Time is already in milliseconds
                }
              }
            }
          }
        }
      }
      
      if (times.length > 0) {
        info = `Imported ${times.length} times from ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`;
        return { times, info };
      }
    } catch (e) {
      // If JSON parsing fails, fall back to line-by-line parsing
    }
    
    // Fallback: parse as simple text format (one time per line)
    const lines = text.trim().split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Try to parse time in various formats (seconds, mm:ss.ms, etc.)
      const timeMatch = trimmedLine.match(/(\d+(?:\.\d+)?)/);
      if (timeMatch) {
        const timeValue = parseFloat(timeMatch[1]);
        // Convert to milliseconds (assume input is in seconds)
        times.push(timeValue * 1000);
      }
    }
    
    if (times.length > 0) {
      info = `Imported ${times.length} times from text format`;
    }
    
    return { times, info };
  };

  const handleFile = async (file: File) => {
    if (file.type !== 'text/plain') {
      setStatus('error');
      setErrorMessage('Please select a .txt file');
      return;
    }

    setStatus('processing');
    
    try {
      const text = await file.text();
      const result = parseTimesFromText(text);
      
      if (result.times.length === 0) {
        setStatus('error');
        setErrorMessage('No valid times found in the file');
        return;
      }
      
      saveTimesToActiveSession(result.times);
      if (onImport) {
        onImport(result.times);
      }
      setImportInfo(result.info);
      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        setImportInfo('');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to read file');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return '⏳';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📁';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'processing':
        return 'Processing file...';
      case 'success':
        return importInfo || 'Times imported successfully!';
      case 'error':
        return errorMessage;
      default:
        return 'Drop a .txt file or click to browse';
    }
  };

  return (
    <div className="space-y-3" style={{ ...themeVars } as React.CSSProperties}>
      <div className="flex items-center justify-between">
        <label 
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Import Times
        </label>
      </div>
      
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
          dragActive ? 'border-blue-500 bg-blue-50' : ''
        }`}
        style={{
          borderColor: dragActive ? '#3b82f6' : 'var(--border-medium)',
          background: dragActive 
            ? (theme === 'light' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.1)')
            : 'var(--hover-bg)'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".txt"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        
        <div className="space-y-2">
          <div className="text-2xl">{getStatusIcon()}</div>
          <div 
            className="text-sm font-medium"
            style={{ 
              color: status === 'error' ? '#ef4444' : 
                     status === 'success' ? '#22c55e' : 
                     'var(--text-primary)' 
            }}
          >
            {getStatusText()}
          </div>
        </div>
      </div>
      
      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Upload a .txt file with timer data. Supports JSON format (CubeTimer export) or simple text format (one time per line in seconds).
      </div>
    </div>
  );
};

export default ImportTimes;