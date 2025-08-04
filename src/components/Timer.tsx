import React, { useState, useEffect, useCallback, useRef } from 'react';
import ScrambleGenerator, { ScrambleGeneratorRef } from './ScrambleGenerator';
import MediaWidget from './MediaWidget';

type TimerState = 'idle' | 'inspection' | 'ready' | 'running' | 'stopped';
type SolveState = 'ok' | 'plus2' | 'dnf';

interface SolveRecord {
  id: string;
  time: number;
  scramble: string;
  timestamp: number;
  state: SolveState;
  ao5?: number | null; // null if DNF, undefined if not enough solves
  ao12?: number | null; // null if DNF, undefined if not enough solves
}

interface TimerProps {
  onBackToHome: () => void;
}

const Timer: React.FC<TimerProps> = ({ onBackToHome }) => {
  const [state, setState] = useState<TimerState>('idle');
  const [time, setTime] = useState(0);
  const [isKeyDown, setIsKeyDown] = useState(false);
  const [keyDownTime, setKeyDownTime] = useState<number | null>(null);
  const [solveHistory, setSolveHistory] = useState<SolveRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSolve, setSelectedSolve] = useState<SolveRecord | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [deleteConfirmationActive, setDeleteConfirmationActive] = useState(false);
  const [toastFadingOut, setToastFadingOut] = useState(false);
  const [inspectionTime, setInspectionTime] = useState(15);
  const [inspectionOvertime, setInspectionOvertime] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [, forceUpdate] = useState({});
  const scrambleRef = useRef<ScrambleGeneratorRef>(null);
  const inspectionStartRef = useRef<number | null>(null);
  const inspectionOvertimeRef = useRef<number>(0);

  // Cubing average calculation functions
  const calculateAverage = (solves: SolveRecord[], count: number): number | null => {
    if (solves.length < count) return null;
    
    const recentSolves = solves.slice(0, count);
    
    // Check if any solve is DNF - if so, average is DNF (return null for display purposes)
    if (recentSolves.some(solve => solve.state === 'dnf')) {
      return null;
    }
    
    // Calculate actual times (add 2 seconds for +2 penalties)
    const actualTimes = recentSolves.map(solve => 
      solve.state === 'plus2' ? solve.time + 2000 : solve.time
    );
    
    const sorted = [...actualTimes].sort((a, b) => a - b);
    
    // Remove fastest and slowest
    const trimmed = sorted.slice(1, -1);
    
    // Calculate average of remaining times
    const sum = trimmed.reduce((acc, time) => acc + time, 0);
    return sum / trimmed.length;
  };

  const calculateBestWorstPossible = (solves: SolveRecord[], count: number): { best: number | null; worst: number | null } => {
    if (solves.length < count) return { best: null, worst: null };
    
    const recentSolves = solves.slice(0, count);
    
    // If any solve is DNF, we can't calculate meaningful best/worst
    if (recentSolves.some(solve => solve.state === 'dnf')) {
      return { best: null, worst: null };
    }
    
    // Calculate actual times (add 2 seconds for +2 penalties)
    const actualTimes = recentSolves.map(solve => 
      solve.state === 'plus2' ? solve.time + 2000 : solve.time
    );
    
    const sorted = [...actualTimes].sort((a, b) => a - b);
    
    // Best possible: remove slowest time and second slowest
    const bestTrimmed = sorted.slice(0, -2);
    const best = bestTrimmed.reduce((acc, time) => acc + time, 0) / bestTrimmed.length;
    
    // Worst possible: remove fastest time and second fastest
    const worstTrimmed = sorted.slice(2);
    const worst = worstTrimmed.reduce((acc, time) => acc + time, 0) / worstTrimmed.length;
    
    return { best, worst };
  };

  // Calculate session mean (no trimming of best/worst)
  const calculateSessionMean = (solves: SolveRecord[]): number | null => {
    if (solves.length === 0) return null;
    
    // Filter out DNF solves
    const validSolves = solves.filter(solve => solve.state !== 'dnf');
    if (validSolves.length === 0) return null;
    
    // Calculate actual times (add 2 seconds for +2 penalties)
    const actualTimes = validSolves.map(solve => 
      solve.state === 'plus2' ? solve.time + 2000 : solve.time
    );
    
    const sum = actualTimes.reduce((acc, time) => acc + time, 0);
    return sum / actualTimes.length;
  };

  // Theme management
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);
    localStorage.setItem('zen-timer-theme', newTheme);
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('zen-timer-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Theme CSS variables
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
    '--shadow-light': theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.3)',
    '--shadow-strong': theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.5)'
  };

  // Determine if we should be in focused mode (fade out UI)
  const isFocused = isKeyDown || state === 'inspection' || state === 'running';

  // Load solve history from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('zen-timer-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Handle migration from old format (array of numbers) to new format
          if (parsed.length > 0 && typeof parsed[0] === 'number') {
            // Old format (array of numbers) - convert to new format
            const migrated: SolveRecord[] = parsed.map((time: number, index: number) => ({
              id: `migrated-${Date.now()}-${index}`,
              time,
              scramble: 'Unknown scramble (migrated)',
              timestamp: Date.now() - (index * 60000), // Approximate timestamps
              state: 'ok' as SolveState
            }));
            setSolveHistory(migrated);
            // Save migrated data
            localStorage.setItem('zen-timer-history', JSON.stringify(migrated));
          } else if (parsed.length > 0 && parsed[0].state === undefined) {
            // Old SolveRecord format without state - add state field
            const migrated: SolveRecord[] = parsed.map((solve: any) => ({
              ...solve,
              state: 'ok' as SolveState
            }));
            setSolveHistory(migrated);
            // Save migrated data
            localStorage.setItem('zen-timer-history', JSON.stringify(migrated));
          } else if (parsed.length > 0 && parsed[0].ao5 === undefined) {
            // SolveRecord format without ao5/ao12 - add average fields
            const migrated: SolveRecord[] = parsed.map((solve: any, index: number) => {
              // Calculate what the averages would have been at this point in history
              const historyAtTime = parsed.slice(index);
              const ao5 = calculateAverage(historyAtTime, 5);
              const ao12 = calculateAverage(historyAtTime, 12);
              
              return {
                ...solve,
                ao5,
                ao12
              };
            });
            setSolveHistory(migrated);
            // Save migrated data
            localStorage.setItem('zen-timer-history', JSON.stringify(migrated));
          } else {
            // New format
            setSolveHistory(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to parse saved solve history:', error);
      }
    }
  }, []);

  // Save solve history to localStorage whenever it changes
  useEffect(() => {
    if (solveHistory.length > 0) {
      localStorage.setItem('zen-timer-history', JSON.stringify(solveHistory));
    }
  }, [solveHistory]);

  const clearHistory = () => {
    setSolveHistory([]);
    localStorage.removeItem('zen-timer-history');
  };

  const updateSolveState = (solveId: string, newState: SolveState) => {
    setSolveHistory(prev => 
      prev.map(solve => 
        solve.id === solveId 
          ? { ...solve, state: newState }
          : solve
      )
    );
  };

  const updateLastSolveState = useCallback((newState: SolveState) => {
    if (solveHistory.length > 0) {
      updateSolveState(solveHistory[0].id, newState);
    }
  }, [solveHistory, updateSolveState]);

  const deleteSolve = (solveId: string) => {
    setSolveHistory(prev => prev.filter(solve => solve.id !== solveId));
    // Close modal if we're deleting the currently selected solve
    if (selectedSolve && selectedSolve.id === solveId) {
      setSelectedSolve(null);
    }
  };

  // Auto-reset delete confirmation after 3 seconds
  useEffect(() => {
    if (deleteConfirmationActive) {
      const timeoutId = setTimeout(() => {
        // Start fade out animation
        setToastFadingOut(true);
        
        // After animation completes, hide toast and reset state
        setTimeout(() => {
          setDeleteConfirmationActive(false);
          setShowDeleteToast(false);
          setToastFadingOut(false);
        }, 300); // 300ms fade out duration
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [deleteConfirmationActive]);

  const handleDeleteConfirmation = useCallback(() => {
    if (solveHistory.length === 0) return;

    if (!deleteConfirmationActive) {
      // First press - show confirmation toast
      setDeleteConfirmationActive(true);
      setShowDeleteToast(true);
      setToastFadingOut(false);
    } else {
      // Second press - actually delete
      const mostRecentSolve = solveHistory[0];
      deleteSolve(mostRecentSolve.id);
      
      // Reset confirmation state
      setDeleteConfirmationActive(false);
      setShowDeleteToast(false);
      setToastFadingOut(false);
    }
  }, [solveHistory, deleteConfirmationActive, deleteSolve]);

  const getDisplayTime = (solve: SolveRecord): string => {
    if (solve.state === 'dnf') {
      return 'DNF';
    }
    const displayTime = solve.state === 'plus2' ? solve.time + 2000 : solve.time;
    return formatTime(displayTime) + (solve.state === 'plus2' ? '+' : '');
  };

  const getHistoryHighlighting = (solve: SolveRecord) => {
    // Only consider non-DNF solves for fastest/slowest
    const validSolves = solveHistory.filter(s => s.state !== 'dnf');
    if (validSolves.length === 0 || solve.state === 'dnf') {
      return { isFastest: false, isSlowest: false };
    }

    const solveTimes = validSolves.map(s => s.state === 'plus2' ? s.time + 2000 : s.time);
    const fastestTime = Math.min(...solveTimes);
    const slowestTime = Math.max(...solveTimes);
    
    const currentTime = solve.state === 'plus2' ? solve.time + 2000 : solve.time;
    
    return {
      isFastest: currentTime === fastestTime && validSolves.length > 1,
      isSlowest: currentTime === slowestTime && validSolves.length > 1
    };
  };

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${seconds}.${ms.toString().padStart(2, '0')}`;
  };

  const getDisplayColor = (): string => {
    if (isKeyDown && keyDownTime && state === 'inspection') {
      const holdTime = Date.now() - keyDownTime;
      if (holdTime >= 500) { // Green after 500ms
        return '#22c55e'; // Green
      } else {
        return '#ef4444'; // Red
      }
    }
    
    switch (state) {
      case 'inspection':
        if (inspectionOvertime > 2) {
          return '#dc2626'; // Dark red for DNF territory
        } else if (inspectionOvertime > 0) {
          return '#f59e0b'; // Orange for +2 territory
        } else if (inspectionTime <= 3) {
          return '#ef4444'; // Red when almost expired
        }
        return '#f59e0b'; // Orange during normal inspection
      case 'running':
        return themeVars['--text-primary']; // Use theme-aware color
      case 'stopped':
        return themeVars['--text-primary']; // Use theme-aware color
      default:
        return themeVars['--text-primary']; // Use theme-aware color
    }
  };

  const getDisplayText = (): string => {
    if (state === 'idle') {
      return '0.00';
    }
    if (state === 'inspection') {
      if (inspectionOvertime > 0) {
        return `+${inspectionOvertime.toFixed(1)}`;
      }
      return inspectionTime.toString();
    }
    if (state === 'ready') {
      return '0.00';
    }
    return formatTime(time);
  };

  const updateTimer = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      setTime(elapsed);
    }
  }, []);

  const updateInspectionTimer = useCallback(() => {
    if (inspectionStartRef.current) {
      const elapsed = Date.now() - inspectionStartRef.current;
      const elapsedSeconds = elapsed / 1000;
      
      if (elapsedSeconds <= 15) {
        const remaining = Math.max(0, 15 - Math.floor(elapsedSeconds));
        setInspectionTime(remaining);
        setInspectionOvertime(0);
      } else {
        // Over inspection time - show overtime
        setInspectionTime(0);
        setInspectionOvertime(elapsedSeconds - 15);
      }
    }
  }, []);

  const startInspection = useCallback(() => {
    setState('inspection');
    inspectionStartRef.current = Date.now();
    setInspectionTime(15);
    setInspectionOvertime(0);
  }, []);

  const startTimer = useCallback((inspectionOvertime: number = 0) => {
    setState('running');
    startTimeRef.current = Date.now();
    setTime(0);
    // Clear inspection timer if it was running
    inspectionStartRef.current = null;
    
    // Store inspection overtime in a ref for penalty calculation later
    inspectionOvertimeRef.current = inspectionOvertime;
  }, []);

  const stopTimer = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Calculate the final time when stopping
    if (startTimeRef.current) {
      const finalTime = Date.now() - startTimeRef.current;
      setTime(finalTime); // Update the display
      
      // Get the current scramble from the scramble generator
      const currentScramble = scrambleRef.current?.getCurrentScramble?.() || 'Unknown scramble';
      
      // Calculate averages for the new solve (based on previous solves + this one)
      setSolveHistory(prev => {
        // Determine solve state based on inspection overtime
        let solveState: SolveState = 'ok';
        const overtime = inspectionOvertimeRef.current;
        if (overtime > 2) {
          solveState = 'dnf';
        } else if (overtime > 0) {
          solveState = 'plus2';
        }
        
        // Reset inspection overtime for next solve
        inspectionOvertimeRef.current = 0;
        
        const tempNewSolve: SolveRecord = {
          id: `solve-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          time: finalTime,
          scramble: currentScramble,
          timestamp: Date.now(),
          state: solveState
        };
        
        // Create updated history with the new solve
        const updatedHistory = [tempNewSolve, ...prev.slice(0, 49)];
        
        // Calculate averages based on the updated history
        const ao5 = calculateAverage(updatedHistory, 5);
        const ao12 = calculateAverage(updatedHistory, 12);
        
        // Create final solve record with averages
        const newSolve: SolveRecord = {
          ...tempNewSolve,
          ao5,
          ao12
        };
        
        return [newSolve, ...prev.slice(0, 49)];
      });
      
      // Generate a new scramble after completing a solve
      if (scrambleRef.current) {
        scrambleRef.current.newScramble();
      }
    }
    
    setState('stopped');
  }, []);


  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (selectedSolve) {
        setSelectedSolve(null);
      } else if (showHistory) {
        setShowHistory(false);
      } else {
        onBackToHome();
      }
      return;
    }

    if (event.code === 'KeyH' && !isKeyDown && state !== 'running') {
      event.preventDefault();
      setShowHistory(!showHistory);
      return;
    }

    // Keyboard shortcuts for adjusting last solve state (only when not typing)
    if (!isKeyDown && state !== 'running' && solveHistory.length > 0) {
      if (event.code === 'Digit2') {
        event.preventDefault();
        updateLastSolveState('plus2');
        return;
      }
      
      if (event.code === 'KeyD') {
        event.preventDefault();
        updateLastSolveState('dnf');
        return;
      }
      
      if (event.code === 'KeyO') {
        event.preventDefault();
        updateLastSolveState('ok');
        return;
      }

      if (event.code === 'Backspace') {
        event.preventDefault();
        handleDeleteConfirmation();
        return;
      }
    }

    if ((event.code === 'ArrowLeft' || event.code === 'ArrowRight') && !isKeyDown && state !== 'running') {
      event.preventDefault();
      if (scrambleRef.current) {
        if (event.code === 'ArrowLeft') {
          scrambleRef.current.previousScramble();
        } else {
          scrambleRef.current.nextScramble();
        }
      }
      return;
    }

    if (event.code !== 'Space') return;
    event.preventDefault();

    if (isKeyDown) return;
    setIsKeyDown(true);
    setKeyDownTime(Date.now());

    if (state === 'idle') {
      startInspection();
    } else if (state === 'inspection') {
      // Don't change state during inspection - just track key press
    } else if (state === 'stopped') {
      // Reset to idle first, then start inspection
      setState('idle');
      setTime(0);
      startTimeRef.current = null;
      // Start inspection after a brief delay to ensure state updates
      setTimeout(() => startInspection(), 0);
    } else if (state === 'running') {
      stopTimer();
    }
  }, [state, isKeyDown, stopTimer, onBackToHome, showHistory, selectedSolve, solveHistory, updateLastSolveState, handleDeleteConfirmation, startInspection]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.code !== 'Space') return;
    event.preventDefault();

    setIsKeyDown(false);
    
    if (state === 'inspection' && keyDownTime && inspectionStartRef.current) {
      const holdTime = Date.now() - keyDownTime;
      if (holdTime >= 500) { // Only start if held for sufficient time
        // Calculate total inspection time used
        const totalInspectionTime = (Date.now() - inspectionStartRef.current) / 1000;
        const overtime = Math.max(0, totalInspectionTime - 15);
        startTimer(overtime);
      }
      // If not held long enough, continue inspection (no reset)
    }
    
    setKeyDownTime(null);
  }, [state, startTimer, keyDownTime, inspectionStartRef]);

  useEffect(() => {
    let frameId: number;
    
    if (state === 'running' && startTimeRef.current) {
      const animate = () => {
        updateTimer();
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
      animationRef.current = frameId;
    } else if (state === 'inspection' && inspectionStartRef.current) {
      const animate = () => {
        updateInspectionTimer();
        frameId = requestAnimationFrame(animate);
      };
      frameId = requestAnimationFrame(animate);
      animationRef.current = frameId;
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [state, updateTimer, updateInspectionTimer]);

  // Force re-renders while key is held to update color transitions
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isKeyDown && keyDownTime) {
      interval = setInterval(() => {
        // Force component to re-render to update color
        forceUpdate({});
      }, 50);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isKeyDown, keyDownTime]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [handleKeyDown, handleKeyUp]);


  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative px-8 transition-colors duration-300"
      style={{
        ...themeVars,
        background: 'var(--bg-primary)'
      } as React.CSSProperties}
    >
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer z-50"
        style={{
          background: theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
          border: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)'}`,
          color: theme === 'light' ? '#666666' : '#a3a3a3',
          opacity: isFocused ? 0 : 1
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';
          e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.borderColor = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';
        }}
      >
        {theme === 'light' ? (
          // Moon icon for switching to dark mode
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.64 13a1 1 0 0 0-1.05-.14 8.05 8.05 0 0 1-3.37.73 8.15 8.15 0 0 1-8.14-8.1 8.59 8.59 0 0 1 .25-2A1 1 0 0 0 8 2.36a10.14 10.14 0 1 0 14 11.69 1 1 0 0 0-.36-1.05z"/>
          </svg>
        ) : (
          // Sun icon for switching to light mode  
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4"/>
            <path d="m12 2v2"/>
            <path d="m12 20v2"/>
            <path d="m4.93 4.93 1.41 1.41"/>
            <path d="m17.66 17.66 1.41 1.41"/>
            <path d="m2 12h2"/>
            <path d="m20 12h2"/>
            <path d="m6.34 17.66-1.41 1.41"/>
            <path d="m19.07 4.93-1.41 1.41"/>
          </svg>
        )}
      </button>

      {/* Scramble display */}
      <div 
        className="absolute top-8 left-8 right-8 transition-opacity duration-300"
        style={{ opacity: isFocused ? 0.1 : 1 }}
      >
        <ScrambleGenerator 
          ref={scrambleRef}
          onNewScramble={() => {}}
        />
      </div>
      
      {/* Main timer area */}
        <div className="text-center max-w-4xl mx-auto">
        <div className="mb-8">
          <div 
            className="text-8xl md:text-9xl font-mono font-bold"
            style={{ 
              color: getDisplayColor(),
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
              transition: isKeyDown ? 'none' : 'color 0.2s ease'
            }}
          >
            {getDisplayText()}
          </div>
        </div>

        {solveHistory.length > 0 && (
          <div 
            className="mt-12 transition-opacity duration-300"
            style={{ opacity: isFocused ? 0 : 1 }}
          >
            <div className="flex gap-6 items-center justify-center">
              {solveHistory.slice(0, 5).map((solve, index) => {
                const highlighting = getHistoryHighlighting(solve);
                return (
                  <div 
                    key={solve.id}
                    className="text-base font-mono cursor-pointer rounded px-2 py-1 transition-colors"
                    style={{ 
                      color: solve.state === 'dnf' ? '#ef4444' : 
                             solve.state === 'plus2' ? '#f59e0b' : 
                             highlighting.isFastest ? '#16a34a' : 
                             highlighting.isSlowest ? '#dc2626' : 
                             'var(--text-secondary)',
                      opacity: index === 0 ? 1 : 0.7 - (index * 0.15)
                    }}
                    onClick={() => setSelectedSolve(solve)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--hover-bg-strong)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {getDisplayTime(solve)}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Average statistics */}
        {solveHistory.length >= 5 && (
          <div 
            className="mt-8 transition-opacity duration-300"
            style={{ opacity: isFocused ? 0 : 1 }}
          >
            <div className="flex flex-col items-center gap-2">
              {/* Ao5 */}
              {(() => {
                const ao5 = calculateAverage(solveHistory, 5);
                const { best: ao5Best, worst: ao5Worst } = calculateBestWorstPossible(solveHistory, 5);
                
                return ao5 ? (
                  <div 
                    className="text-sm font-mono font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Ao5: {formatTime(ao5)} <span className="text-xs font-normal">(
                    <span style={{ color: '#16a34a' }}>{formatTime(ao5Best!)}</span>
                    /
                    <span style={{ color: '#dc2626' }}>{formatTime(ao5Worst!)}</span>
                    )</span>
                  </div>
                ) : (
                  <div 
                    className="text-sm font-mono font-semibold"
                    style={{ color: '#ef4444' }}
                  >
                    Ao5: DNF
                  </div>
                );
              })()}
              
              {/* Ao12 */}
              {solveHistory.length >= 12 && (() => {
                const ao12 = calculateAverage(solveHistory, 12);
                const { best: ao12Best, worst: ao12Worst } = calculateBestWorstPossible(solveHistory, 12);
                
                return ao12 ? (
                  <div 
                    className="text-sm font-mono font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Ao12: {formatTime(ao12)} <span className="text-xs font-normal">(
                    <span style={{ color: '#16a34a' }}>{formatTime(ao12Best!)}</span>
                    /
                    <span style={{ color: '#dc2626' }}>{formatTime(ao12Worst!)}</span>
                    )</span>
                  </div>
                ) : (
                  <div 
                    className="text-sm font-mono font-semibold"
                    style={{ color: '#ef4444' }}
                  >
                    Ao12: DNF
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>

      <div 
        className="absolute bottom-8 text-center text-sm transition-opacity duration-300"
        style={{ 
          color: 'var(--text-tertiary)',
          opacity: isFocused ? 0 : 1
        }}
      >
        <div className="mb-2">
          {state === 'idle' && (
            <>
              Press{' '}
              <kbd 
                className="px-2 py-1 rounded text-xs font-medium mx-1" 
                style={{ 
                  background: 'var(--gray-100)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)'
                }}
              >
                Space
              </kbd>{' '}
              to start inspection
            </>
          )}
          {state === 'inspection' && (
            <>
              Press{' '}
              <kbd 
                className="px-2 py-1 rounded text-xs font-medium mx-1" 
                style={{ 
                  background: 'var(--gray-100)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)'
                }}
              >
                Space
              </kbd>{' '}
              when ready to solve
            </>
          )}
          {state === 'ready' && (
            <>
              Hold{' '}
              <kbd 
                className="px-2 py-1 rounded text-xs font-medium mx-1" 
                style={{ 
                  background: 'var(--gray-100)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)'
                }}
              >
                Space
              </kbd>{' '}
              and release to start
            </>
          )}
          {state === 'running' && (
            <>
              Press{' '}
              <kbd 
                className="px-2 py-1 rounded text-xs font-medium mx-1" 
                style={{ 
                  background: 'var(--gray-100)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)'
                }}
              >
                Space
              </kbd>{' '}
              to stop
            </>
          )}
          {state === 'stopped' && (
            <>
              Press{' '}
              <kbd 
                className="px-2 py-1 rounded text-xs font-medium mx-1" 
                style={{ 
                  background: 'var(--gray-100)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)'
                }}
              >
                Space
              </kbd>{' '}
              for next solve
            </>
          )}
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          <div>
            Press{' '}
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              ←
            </kbd>
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              →
            </kbd>{' '}
            for scrambles
          </div>
          <div>
            Press{' '}
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              H
            </kbd>{' '}
            for history
          </div>
          <div>
            Press{' '}
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              O
            </kbd>
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              2
            </kbd>
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              D
            </kbd>{' '}
            for solve state
          </div>
          <div>
            Press{' '}
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              ⌫
            </kbd>{' '}
            to delete last solve
          </div>
          <div>
            Press{' '}
            <kbd 
              className="px-2 py-1 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                borderColor: 'var(--border-medium)',
                color: 'var(--text-primary)'
              }}
            >
              ESC
            </kbd>{' '}
            to go back
          </div>
        </div>
        </div>

      {showHistory && (
        <div 
          className="fixed left-6 top-6 bottom-6 w-80 transition-opacity duration-300 flex flex-col"
          style={{
            opacity: isFocused ? 0 : 1
          }}
        >
          <div 
            className="h-full rounded-xl backdrop-blur-sm border flex flex-col overflow-hidden"
            style={{
              background: 'var(--bg-secondary)',
              borderColor: 'var(--border-medium)',
              boxShadow: theme === 'light' ? '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)' : '0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="px-6 py-4" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  History
                </h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors"
                  style={{ 
                    background: 'var(--hover-bg)', 
                    color: 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg-strong)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-3" style={{ background: 'var(--bg-tertiary)' }}>
                {/* Session Mean */}
                {solveHistory.length > 0 && (
                  <div className="mb-3 pb-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Session Mean
                    </div>
                    <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {(() => {
                        const sessionMean = calculateSessionMean(solveHistory);
                        return sessionMean ? formatTime(sessionMean) : 'DNF';
                      })()}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Times ({solveHistory.length})
                  </h3>
                  {solveHistory.length > 0 && (
                    <button
                      onClick={clearHistory}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{
                        color: 'var(--text-tertiary)',
                        background: 'var(--hover-bg)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div 
                className="flex-1 overflow-y-auto"
                style={{ background: 'var(--bg-tertiary)' }}
              >
                {solveHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        No solves yet
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {solveHistory.map((solve, index) => {
                      const highlighting = getHistoryHighlighting(solve);
                      return (
                        <div 
                          key={solve.id}
                          className="px-3 py-3 rounded-lg transition-colors cursor-pointer"
                          style={{ 
                            background: highlighting.isFastest ? 'rgba(34, 197, 94, 0.08)' : 
                                       highlighting.isSlowest ? 'rgba(220, 38, 38, 0.08)' : 
                                       'transparent',
                            border: highlighting.isFastest ? '1px solid rgba(34, 197, 94, 0.2)' : 
                                   highlighting.isSlowest ? '1px solid rgba(220, 38, 38, 0.2)' : 
                                   '1px solid transparent'
                          }}
                          onClick={() => setSelectedSolve(solve)}
                          onMouseEnter={(e) => {
                            if (!highlighting.isFastest && !highlighting.isSlowest) {
                              e.currentTarget.style.background = 'var(--hover-bg)';
                              e.currentTarget.style.borderColor = 'var(--border-medium)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!highlighting.isFastest && !highlighting.isSlowest) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'transparent';
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span 
                                className="text-xs font-medium"
                                style={{ 
                                  color: highlighting.isFastest ? '#16a34a' : 
                                         highlighting.isSlowest ? '#dc2626' : 
                                         'var(--text-tertiary)'
                                }}
                              >
                                #{solveHistory.length - index}
                              </span>
                              {solve.state !== 'ok' && (
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                                  style={{
                                    background: solve.state === 'dnf' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: solve.state === 'dnf' ? '#ef4444' : '#f59e0b'
                                  }}
                                >
                                  {solve.state.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span 
                              className="font-mono text-sm font-medium"
                              style={{ 
                                color: solve.state === 'dnf' ? '#ef4444' : 
                                       solve.state === 'plus2' ? '#f59e0b' : 
                                       highlighting.isFastest ? '#16a34a' : 
                                       highlighting.isSlowest ? '#dc2626' : 
                                       'var(--text-primary)' 
                              }}
                            >
                              {getDisplayTime(solve)}
                            </span>
                          </div>
                          <div 
                            className="text-xs mt-1"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {new Date(solve.timestamp).toLocaleString()}
                          </div>
                          
                          {/* Display averages if available */}
                          {(solve.ao5 !== undefined || solve.ao12 !== undefined) && (
                            <div className="flex gap-4 mt-2 text-xs font-mono">
                              {solve.ao5 !== undefined && (
                                <div style={{ color: 'var(--text-secondary)' }}>
                                  Ao5: <span style={{ color: solve.ao5 === null ? '#ef4444' : 'var(--text-primary)' }}>
                                    {solve.ao5 === null ? 'DNF' : formatTime(solve.ao5)}
                                  </span>
                                </div>
                              )}
                              {solve.ao12 !== undefined && (
                                <div style={{ color: 'var(--text-secondary)' }}>
                                  Ao12: <span style={{ color: solve.ao12 === null ? '#ef4444' : 'var(--text-primary)' }}>
                                    {solve.ao12 === null ? 'DNF' : formatTime(solve.ao12)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Solve View Modal */}
      {selectedSolve && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedSolve(null)}
        >
          <div 
            className="rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
            style={{ background: 'var(--bg-primary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Solve Details
              </h2>
              <button
                onClick={() => setSelectedSolve(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors"
                style={{ 
                  background: 'var(--hover-bg)', 
                  color: 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--hover-bg-strong)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                }}
              >
                ×
              </button>
            </div>

{(() => {
              // Find the current version of the solve (to reflect any state changes)
              const currentSolve = solveHistory.find(s => s.id === selectedSolve.id) || selectedSolve;
              
              return (
                <div className="space-y-4">
                  <div className="text-center">
                    <div 
                      className="text-4xl font-mono font-bold mb-2"
                      style={{ 
                        color: currentSolve.state === 'dnf' ? '#ef4444' : 
                               currentSolve.state === 'plus2' ? '#f59e0b' : 
                               'var(--text-primary)' 
                      }}
                    >
                      {getDisplayTime(currentSolve)}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(currentSolve.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <div 
                    className="p-4 rounded-lg"
                    style={{ background: 'var(--hover-bg)' }}
                  >
                    <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Scramble
                    </div>
                    <div 
                      className="font-mono text-sm leading-relaxed"
                      style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}
                    >
                      {currentSolve.scramble}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      Solve State
                    </div>
                    <div className="flex gap-2">
                      {(['ok', 'plus2', 'dnf'] as SolveState[]).map((state) => (
                        <button
                          key={state}
                          onClick={() => updateSolveState(currentSolve.id, state)}
                          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          style={{
                            background: currentSolve.state === state ? 
                              (state === 'dnf' ? 'rgba(239, 68, 68, 0.1)' : 
                               state === 'plus2' ? 'rgba(245, 158, 11, 0.1)' : 
                               'rgba(34, 197, 94, 0.1)') : 'var(--hover-bg)',
                            color: currentSolve.state === state ? 
                              (state === 'dnf' ? '#ef4444' : 
                               state === 'plus2' ? '#f59e0b' : 
                               '#16a34a') : 'var(--text-secondary)',
                            border: currentSolve.state === state ? 
                              (state === 'dnf' ? '1px solid rgba(239, 68, 68, 0.2)' : 
                               state === 'plus2' ? '1px solid rgba(245, 158, 11, 0.2)' : 
                               '1px solid rgba(34, 197, 94, 0.2)') : '1px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (currentSolve.state !== state) {
                              e.currentTarget.style.background = 'var(--hover-bg-strong)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentSolve.state !== state) {
                              e.currentTarget.style.background = 'var(--hover-bg)';
                            }
                          }}
                        >
                          {state === 'ok' ? 'OK' : state.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div 
                    className="p-3 rounded-lg"
                    style={{ background: 'var(--hover-bg)' }}
                  >
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Raw Time: {formatTime(currentSolve.time)}
                    </div>
                  </div>

                  <div className="pt-3 border-t" style={{ borderColor: 'rgba(0, 0, 0, 0.08)' }}>
                    <button
                      onClick={() => deleteSolve(currentSolve.id)}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#dc2626',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                      }}
                    >
                      Delete Solve
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Delete Confirmation Toast */}
      {showDeleteToast && (
        <div 
          className="fixed top-8 right-8 z-50 transition-all duration-300"
          style={{
            animation: toastFadingOut 
              ? 'fadeOut 0.3s ease-out forwards' 
              : 'slideInRight 0.3s ease-out forwards',
            opacity: toastFadingOut ? 0 : 1
          }}
        >
          <div 
            className="rounded-lg shadow-2xl border px-6 py-4"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              boxShadow: theme === 'light' ? '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08)' : '0 20px 40px rgba(0, 0, 0, 0.4), 0 8px 16px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Press{' '}
              <kbd 
                className="px-1.5 py-0.5 rounded text-xs font-medium mx-1" 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontFamily: 'monospace'
                }}
              >
                ⌫
              </kbd>{' '}
              again to delete {solveHistory.length > 0 ? getDisplayTime(solveHistory[0]) : ''}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          @keyframes fadeOut {
            from {
              opacity: 1;
              transform: translateX(0);
            }
            to {
              opacity: 0;
              transform: translateX(10px);
            }
          }
        `
      }} />

      {/* Media Widget */}
      <MediaWidget isFocused={isFocused} theme={theme} />
    </div>
  );
};

export default Timer;