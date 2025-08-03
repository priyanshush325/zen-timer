import React, { useState, useEffect, useCallback, useRef } from 'react';
import ScrambleGenerator, { ScrambleGeneratorRef } from './ScrambleGenerator';

type TimerState = 'idle' | 'ready' | 'running' | 'stopped';
type SolveState = 'ok' | 'plus2' | 'dnf';

interface SolveRecord {
  id: string;
  time: number;
  scramble: string;
  timestamp: number;
  state: SolveState;
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
  const [, forceUpdate] = useState({});
  const scrambleRef = useRef<ScrambleGeneratorRef>(null);

  // Determine if we should be in focused mode (fade out UI)
  const isFocused = isKeyDown || state === 'running';

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
    if (isKeyDown && keyDownTime) {
      const holdTime = Date.now() - keyDownTime;
      if (holdTime >= 500) { // Green after 500ms
        return '#22c55e'; // Green
      } else {
        return '#ef4444'; // Red
      }
    }
    
    switch (state) {
      case 'running':
        return '#000000'; // Black
      case 'stopped':
        return '#000000'; // Black (neutral after solve)
      default:
        return '#000000'; // Black (neutral)
    }
  };

  const getDisplayText = (): string => {
    if (state === 'idle') {
      return '0.00';
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

  const startTimer = useCallback(() => {
    setState('running');
    startTimeRef.current = Date.now();
    setTime(0);
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
      
      // Create new solve record
      const newSolve: SolveRecord = {
        id: `solve-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        time: finalTime,
        scramble: currentScramble,
        timestamp: Date.now(),
        state: 'ok'
      };
      
      setSolveHistory(prev => [newSolve, ...prev.slice(0, 49)]); // Save to history
      
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
      setState('ready');
    } else if (state === 'stopped') {
      // Reset to idle first, then to ready
      setState('idle');
      setTime(0);
      startTimeRef.current = null;
      // Set ready state after a brief delay to ensure state updates
      setTimeout(() => setState('ready'), 0);
    } else if (state === 'running') {
      stopTimer();
    }
  }, [state, isKeyDown, stopTimer, onBackToHome, showHistory, selectedSolve, solveHistory, updateLastSolveState, handleDeleteConfirmation]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.code !== 'Space') return;
    event.preventDefault();

    setIsKeyDown(false);
    
    if (state === 'ready' && keyDownTime) {
      const holdTime = Date.now() - keyDownTime;
      if (holdTime >= 500) { // Only start if held for sufficient time
        startTimer();
      } else {
        setState('idle'); // Go back to idle if not held long enough
      }
    }
    
    setKeyDownTime(null);
  }, [state, startTimer, keyDownTime]);

  useEffect(() => {
    let frameId: number;
    
    if (state === 'running' && startTimeRef.current) {
      const animate = () => {
        updateTimer();
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
  }, [state, updateTimer]);

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
    <div className="min-h-screen flex flex-col items-center justify-center relative px-8">
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
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
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
              to get ready, release to start
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
              background: 'rgba(255, 255, 255, 0.95)',
              borderColor: 'rgba(0, 0, 0, 0.08)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div className="px-6 py-4 bg-white bg-opacity-50">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  History
                </h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors"
                  style={{ 
                    background: 'rgba(0, 0, 0, 0.04)', 
                    color: 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-6 py-3 bg-white bg-opacity-30">
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
                        background: 'rgba(0, 0, 0, 0.04)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.color = '#ef4444';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
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
                              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
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
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
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
                  background: 'rgba(0, 0, 0, 0.04)', 
                  color: 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
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
                    style={{ background: 'rgba(0, 0, 0, 0.02)' }}
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
                               'rgba(34, 197, 94, 0.1)') : 'rgba(0, 0, 0, 0.04)',
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
                              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentSolve.state !== state) {
                              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
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
                    style={{ background: 'rgba(0, 0, 0, 0.02)' }}
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
            className="bg-white rounded-lg shadow-2xl border px-6 py-4"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.2)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08)'
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
    </div>
  );
};

export default Timer;