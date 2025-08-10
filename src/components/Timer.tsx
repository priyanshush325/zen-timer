import React, { useState, useEffect, useCallback, useRef } from 'react';

// Google Analytics gtag function declaration
declare global {
  function gtag(...args: any[]): void;
}
import ScrambleGenerator, { ScrambleGeneratorRef } from './ScrambleGenerator';
import MediaWidget from './MediaWidget';
import Settings, { SettingsData } from './Settings';
import SessionManager from './SessionManager';
import PuzzleIcon from './PuzzleIcon';
import GraphWidget from './GraphWidget';
import { useSessions } from '../hooks/useSessions';
import ImportTimes from './ImportTimes';

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
  inspectionTime?: number; // time used for inspection in seconds, undefined if no inspection
  puzzleType?: string; // e.g., '333', '222', '444', etc. Defaults to '333' if missing
}

interface TimerProps {}

const Timer: React.FC<TimerProps> = () => {
  const [state, setState] = useState<TimerState>('idle');
  const [time, setTime] = useState(0);
  const [isKeyDown, setIsKeyDown] = useState(false);
  const [keyDownTime, setKeyDownTime] = useState<number | null>(null);
  const [keyDownStartState, setKeyDownStartState] = useState<TimerState | null>(null);
  const {
    sessions,
    activeSessionId,
    getActiveSession,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    addSolveToActiveSession,
    updateSolveInActiveSession,
    deleteSolveFromActiveSession,
    clearActiveSession
  } = useSessions();
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSolve, setSelectedSolve] = useState<SolveRecord | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [deleteConfirmationActive, setDeleteConfirmationActive] = useState(false);
  const [graphRefreshTrigger, setGraphRefreshTrigger] = useState(0);
  const [currentCubeType, setCurrentCubeType] = useState('333');
  const [showGraphWidget, setShowGraphWidget] = useState(true);
  const [toastFadingOut, setToastFadingOut] = useState(false);
  const [inspectionTime, setInspectionTime] = useState(15);
  const [inspectionOvertime, setInspectionOvertime] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    holdDuration: 500,
    useInspection: true,
    timerFontSize: 3, // Default to medium size
    averageFontSize: 2 // Default to small-medium size
  });
  const [, forceUpdate] = useState({});
  const scrambleRef = useRef<ScrambleGeneratorRef>(null);
  const inspectionStartRef = useRef<number | null>(null);
  const inspectionOvertimeRef = useRef<number>(0);
  const inspectionTimeUsedRef = useRef<number | undefined>(undefined);
  const timerStoppedRef = useRef<boolean>(false);

  // Cubing average calculation functions
  const calculateAverage = (solves: SolveRecord[], count: number): number | null => {
    if (solves.length < count) return null;
    
    const recentSolves = solves.slice(0, count);
    
    // Count DNFs in the recent solves
    const dnfCount = recentSolves.filter(solve => solve.state === 'dnf').length;
    
    // If there are 2 or more DNFs, the average is DNF
    if (dnfCount >= 2) {
      return null;
    }
    
    // Create array with actual times, treating DNF as worst possible (Infinity)
    const actualTimes = recentSolves.map(solve => {
      if (solve.state === 'dnf') return Infinity;
      return solve.state === 'plus2' ? solve.time + 2000 : solve.time;
    });
    
    const sorted = [...actualTimes].sort((a, b) => a - b);
    
    // Remove fastest and slowest (DNF will be slowest and get trimmed out)
    const trimmed = sorted.slice(1, -1);
    
    // Filter out any Infinity values (shouldn't happen after trimming, but safety check)
    const validTimes = trimmed.filter(time => time !== Infinity);
    
    if (validTimes.length === 0) return null;
    
    // Calculate average of remaining times
    const sum = validTimes.reduce((acc, time) => acc + time, 0);
    return sum / validTimes.length;
  };

  const calculateBestWorstPossible = (solves: SolveRecord[], count: number): { best: number | null; worst: number | null } => {
    if (solves.length < count) return { best: null, worst: null };
    
    const recentSolves = solves.slice(0, count);
    
    // Count DNFs in the recent solves
    const dnfCount = recentSolves.filter(solve => solve.state === 'dnf').length;
    
    // If there are 2 or more DNFs, we can't calculate meaningful best/worst
    if (dnfCount >= 2) {
      return { best: null, worst: null };
    }
    
    // Create array with actual times, treating DNF as worst possible (Infinity)
    const actualTimes = recentSolves.map(solve => {
      if (solve.state === 'dnf') return Infinity;
      return solve.state === 'plus2' ? solve.time + 2000 : solve.time;
    });
    
    const sorted = [...actualTimes].sort((a, b) => a - b);
    
    // Best possible: remove slowest time and second slowest (DNF will be among slowest)
    const bestTrimmed = sorted.slice(0, -2).filter(time => time !== Infinity);
    const best = bestTrimmed.length > 0 ? bestTrimmed.reduce((acc, time) => acc + time, 0) / bestTrimmed.length : null;
    
    // Worst possible: remove fastest time and second fastest
    const worstTrimmed = sorted.slice(2).filter(time => time !== Infinity);
    const worst = worstTrimmed.length > 0 ? worstTrimmed.reduce((acc, time) => acc + time, 0) / worstTrimmed.length : null;
    
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

  // Font size helpers
  const getTimerFontClass = (size: number): string => {
    const sizeMap = {
      1: 'text-6xl md:text-7xl',    // XS - smaller than current default
      2: 'text-7xl md:text-8xl',    // S
      3: 'text-8xl md:text-9xl',    // M - current default
      4: 'text-9xl md:text-[10rem]', // L
      5: 'text-[8rem] md:text-[12rem]' // XL - very large
    };
    return sizeMap[size as keyof typeof sizeMap] || sizeMap[3];
  };

  const getAverageFontClass = (size: number): string => {
    const sizeMap = {
      1: 'text-xs',     // XS
      2: 'text-sm',     // S - current default
      3: 'text-base',   // M
      4: 'text-lg',     // L
      5: 'text-xl'      // XL
    };
    return sizeMap[size as keyof typeof sizeMap] || sizeMap[2];
  };

  // Theme management
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);
    localStorage.setItem('zen-timer-theme', newTheme);
  };

  // Load theme and settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('zen-timer-theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    
    const savedSettings = localStorage.getItem('zen-timer-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
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

  // Settings change handler
  const handleSettingsChange = (newSettings: SettingsData) => {
    setSettings(newSettings);
    localStorage.setItem('zen-timer-settings', JSON.stringify(newSettings));
  };

  // Determine if we should be in focused mode (fade out UI)
  const isFocused = isKeyDown || state === 'inspection' || state === 'running';

  // Get current session data
  const activeSession = getActiveSession();
  const solveHistory = activeSession?.solves || [];

  const clearHistory = () => {
    clearActiveSession();
  };

  const updateSolveState = (solveId: string, newState: SolveState) => {
    updateSolveInActiveSession(solveId, { state: newState });
  };

  const updateLastSolveState = useCallback((newState: SolveState) => {
    if (solveHistory.length > 0) {
      updateSolveState(solveHistory[0].id, newState);
    }
  }, [solveHistory, updateSolveState]);

  const deleteSolve = (solveId: string) => {
    deleteSolveFromActiveSession(solveId);
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
    // Only show hold duration colors when actually able to start timer
    if (isKeyDown && keyDownTime) {
      if (state === 'inspection') {
        // In inspection state - show hold duration feedback
        if (settings.holdDuration === 0) {
          return '#22c55e'; // Immediately green for 0ms
        }
        const holdTime = Date.now() - keyDownTime;
        if (holdTime >= settings.holdDuration) {
          return '#22c55e'; // Green
        } else {
          return '#ef4444'; // Red
        }
      } else if (state === 'idle' && !settings.useInspection) {
        // In idle state with no inspection - show hold duration feedback
        if (settings.holdDuration === 0) {
          return '#22c55e'; // Immediately green for 0ms
        }
        const holdTime = Date.now() - keyDownTime;
        if (holdTime >= settings.holdDuration) {
          return '#22c55e'; // Green
        } else {
          return '#ef4444'; // Red
        }
      }
      // If in idle state with inspection enabled, don't show hold colors (just starting inspection)
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

  const startTimer = useCallback((inspectionOvertime: number = 0, totalInspectionTime?: number) => {
    setState('running');
    startTimeRef.current = Date.now();
    setTime(0);
    
    timerStoppedRef.current = false;
    
    inspectionOvertimeRef.current = inspectionOvertime;
    
    inspectionTimeUsedRef.current = totalInspectionTime;
    inspectionStartRef.current = null;
    
    // Track timer start event
    if (typeof gtag !== 'undefined') {
      gtag('event', 'timer_start', {
        event_category: 'Timer',
        event_label: currentCubeType,
        custom_parameters: {
          had_inspection: totalInspectionTime !== undefined,
          inspection_overtime: inspectionOvertime
        }
      });
    }
  }, [currentCubeType]);

  const stopTimer = useCallback(() => {
    if (timerStoppedRef.current) {
      return;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Calculate the final time when stopping
    if (startTimeRef.current && state === 'running') {
      timerStoppedRef.current = true; // Mark as processed
      const finalTime = Date.now() - startTimeRef.current;
      setTime(finalTime); // Update the display
      
      const currentScramble = scrambleRef.current?.getCurrentScramble?.() || 'Unknown scramble';
      
      let solveState: SolveState = 'ok';
      const overtime = inspectionOvertimeRef.current;
      if (overtime > 2) {
        solveState = 'dnf';
      } else if (overtime > 0) {
        solveState = 'plus2';
      }
      
      const inspectionTimeUsed = inspectionTimeUsedRef.current;
      
      inspectionOvertimeRef.current = 0;
      inspectionTimeUsedRef.current = undefined;
      const newSolve: SolveRecord = {
        id: `solve-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        time: finalTime,
        scramble: currentScramble,
        timestamp: Date.now(),
        state: solveState,
        inspectionTime: inspectionTimeUsed,
        puzzleType: currentCubeType
      };
      
      addSolveToActiveSession(newSolve);
      
      // Trigger graph refresh
      setGraphRefreshTrigger(Date.now());
      
      // Generate a new scramble after completing a solve
      if (scrambleRef.current) {
        scrambleRef.current.newScramble();
      }
      setState('stopped');
    } else {
      // If no startTimeRef but we're stopping, still set state
      setState('stopped');
    }
  }, [state]);


  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (selectedSolve) {
        setSelectedSolve(null);
      } else if (showSettings) {
        setShowSettings(false);
      } else if (showHistory) {
        setShowHistory(false);
      }
      return;
    }

    if (event.code === 'KeyH' && !isKeyDown && state !== 'running') {
      event.preventDefault();
      setShowHistory(!showHistory);
      return;
    }

    if (event.code === 'KeyS' && !isKeyDown && state !== 'running') {
      event.preventDefault();
      setShowSettings(!showSettings);
      return;
    }

    if (event.code === 'KeyG' && !isKeyDown && state !== 'running') {
      event.preventDefault();
      setShowGraphWidget(!showGraphWidget);
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
    setKeyDownStartState(state); // Remember what state we were in when key was pressed

    if (state === 'idle') {
      if (settings.useInspection) {
        startInspection();
      } else {
        // Skip inspection, go directly to timer hold
      }
    } else if (state === 'inspection') {
      // Don't change state during inspection - just track key press
    } else if (state === 'stopped') {
      // Reset to idle first, then start inspection if enabled
      setState('idle');
      setTime(0);
      startTimeRef.current = null;
      // Start inspection immediately if enabled
      if (settings.useInspection) {
        startInspection();
      }
    } else if (state === 'running') {
      stopTimer();
    }
  }, [state, isKeyDown, stopTimer, showHistory, selectedSolve, solveHistory, updateLastSolveState, handleDeleteConfirmation, startInspection, settings.useInspection]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.code !== 'Space') return;
    event.preventDefault();

    setIsKeyDown(false);
    
    if (state === 'inspection' && keyDownTime && inspectionStartRef.current) {
      // Only allow timer start if the keypress started from inspection state (not from idle)
      if (keyDownStartState === 'inspection') {
        const holdTime = Date.now() - keyDownTime;
        if (holdTime >= settings.holdDuration || settings.holdDuration === 0) {
          // Calculate total inspection time used
          const totalInspectionTime = (Date.now() - inspectionStartRef.current) / 1000;
          const overtime = Math.max(0, totalInspectionTime - 15);
          startTimer(overtime, totalInspectionTime);
        }
        // If not held long enough, continue inspection (no reset)
      }
      // If keypress started from idle, do nothing (just started inspection)
    } else if (state === 'idle' && !settings.useInspection && keyDownTime) {
      // Only start timer from idle if inspection is disabled
      const holdTime = Date.now() - keyDownTime;
      if (holdTime >= settings.holdDuration || settings.holdDuration === 0) {
        startTimer(0, undefined); // No inspection time, no overtime
      }
    }
    // Note: If inspection is enabled, timer can ONLY start from inspection state, never from idle
    
    setKeyDownTime(null);
    setKeyDownStartState(null); // Reset the start state tracking
  }, [state, startTimer, keyDownTime, inspectionStartRef, settings.holdDuration, settings.useInspection]);

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
      {/* Top right controls */}
      <div className="absolute top-6 right-6 flex gap-2 z-50" style={{ opacity: isFocused ? 0 : 1 }}>
        {/* Settings button */}
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
          style={{
            background: theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)'}`,
            color: theme === 'light' ? '#666666' : '#a3a3a3'
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
          {/* Gear icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
          </svg>
        </button>
        
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer"
          style={{
            background: theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)'}`,
            color: theme === 'light' ? '#666666' : '#a3a3a3'
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
      </div>

      {/* Scramble display */}
      <div 
        className="absolute top-8 left-8 right-8 transition-opacity duration-300"
        style={{ opacity: isFocused ? 0.1 : 1 }}
      >
        <ScrambleGenerator 
          ref={scrambleRef}
          onNewScramble={() => {}}
          onCubeTypeChange={(cubeType) => setCurrentCubeType(cubeType)}
        />
      </div>
      
      {/* Main timer area */}
        <div className="text-center max-w-4xl mx-auto">
        <div className="mb-8">
          <div 
            className={`${getTimerFontClass(settings.timerFontSize)} font-mono font-bold`}
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
                    className={`${getAverageFontClass(settings.averageFontSize)} font-mono font-semibold`}
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
                    className={`${getAverageFontClass(settings.averageFontSize)} font-mono font-semibold`}
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
                    className={`${getAverageFontClass(settings.averageFontSize)} font-mono font-semibold`}
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
                    className={`${getAverageFontClass(settings.averageFontSize)} font-mono font-semibold`}
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
          {state === 'idle' && settings.useInspection && (
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
          {state === 'inspection' && (
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
              {settings.holdDuration === 0 ? 'to start' : `for ${settings.holdDuration}ms to start`}
            </>
          )}
          {state === 'idle' && !settings.useInspection && (
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
              {settings.holdDuration === 0 ? 'to start' : `for ${settings.holdDuration}ms to start`}
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
              S
            </kbd>{' '}
            for settings
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
              G
            </kbd>{' '}
            for stats
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
            to close dialogs
          </div>
          
          {/* Analytics Disclaimer */}
          <div className="mt-3">
            <div className="text-[10px] opacity-50" style={{ color: 'var(--text-secondary)' }}>
              Zen Timer uses Google Analytics.{' '}
              <a 
                href="https://github.com/your-username/zen-timer/blob/main/index.html#L11-L19" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                Check the code here
              </a>
            </div>
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
                {/* Session Manager */}
                <div className="mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <SessionManager
                    theme={theme}
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    onSessionChange={switchSession}
                    onCreateSession={createSession}
                    onDeleteSession={deleteSession}
                    onRenameSession={renameSession}
                  />
                </div>

                {/* Import Times */}
                <div className="mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <ImportTimes
                    theme={theme}
                    onImport={(times) => {
                      // Import functionality will be handled by the ImportTimes component
                      // It will add solves directly to the active session via localStorage migration
                      // Force update by switching session state
                      forceUpdate({});
                    }}
                  />
                </div>

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
                              <PuzzleIcon 
                                puzzleType={solve.puzzleType || '333'}
                                size={14}
                                className={highlighting.isFastest ? 'text-green-600' : 
                                         highlighting.isSlowest ? 'text-red-600' : 
                                         'text-current'}
                              />
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
                    className="p-3 rounded-lg space-y-2"
                    style={{ background: 'var(--hover-bg)' }}
                  >
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Raw Time: {formatTime(currentSolve.time)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      Inspection: {currentSolve.inspectionTime !== undefined 
                        ? `${currentSolve.inspectionTime.toFixed(1)}s` 
                        : 'Not tracked'
                      }
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

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
          theme={theme}
          isFocused={isFocused}
        />
      )}

      {/* Graph Widget */}
      {showGraphWidget && (
        <GraphWidget 
          isFocused={isFocused} 
          theme={theme} 
          currentCubeType={currentCubeType}
          refreshTrigger={graphRefreshTrigger}
          sessions={sessions}
          getActiveSession={getActiveSession}
        />
      )}

      {/* Media Widget */}
      <MediaWidget isFocused={isFocused} theme={theme} />
    </div>
  );
};

export default Timer;