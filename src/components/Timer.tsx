import React, { useState, useEffect, useCallback, useRef } from 'react';

type TimerState = 'idle' | 'ready' | 'running' | 'stopped';

interface TimerProps {
  onBackToHome: () => void;
}

const Timer: React.FC<TimerProps> = ({ onBackToHome }) => {
  const [state, setState] = useState<TimerState>('idle');
  const [time, setTime] = useState(0);
  const [isKeyDown, setIsKeyDown] = useState(false);
  const [keyDownTime, setKeyDownTime] = useState<number | null>(null);
  const [solveHistory, setSolveHistory] = useState<number[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [, forceUpdate] = useState({});

  // Determine if we should be in focused mode (fade out UI)
  const isFocused = isKeyDown || state === 'running';

  // Load solve history from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('zen-timer-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSolveHistory(parsed);
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
    if (startTimeRef.current && state === 'running') {
      const elapsed = Date.now() - startTimeRef.current;
      setTime(elapsed);
      animationRef.current = requestAnimationFrame(updateTimer);
    }
  }, [state]);

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
      setSolveHistory(prev => [finalTime, ...prev.slice(0, 49)]); // Save to history
    }
    
    setState('stopped');
  }, []);


  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (showHistory) {
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
  }, [state, isKeyDown, stopTimer, onBackToHome, showHistory]);

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
    if (state === 'running') {
      animationRef.current = requestAnimationFrame(updateTimer);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
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
            <div 
              className="text-sm mb-3"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Recent times
            </div>
            <div className="flex gap-6 items-center justify-center">
              {solveHistory.slice(0, 5).map((time, index) => (
                <div 
                  key={index}
                  className="text-base font-mono"
                  style={{ 
                    color: index === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                    opacity: index === 0 ? 1 : 0.7 - (index * 0.15)
                  }}
                >
                  {formatTime(time)}
                </div>
              ))}
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
        <div className="flex gap-4 justify-center">
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
                  <div className="p-4 space-y-1">
                    {solveHistory.map((time, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors"
                        style={{ 
                          background: index === 0 ? 'rgba(34, 197, 94, 0.08)' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (index !== 0) {
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (index !== 0) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <span 
                          className="text-xs font-medium"
                          style={{ 
                            color: index === 0 ? '#16a34a' : 'var(--text-tertiary)',
                            width: '24px'
                          }}
                        >
                          #{solveHistory.length - index}
                        </span>
                        <span 
                          className="font-mono text-sm"
                          style={{ color: index === 0 ? '#16a34a' : 'var(--text-primary)' }}
                        >
                          {formatTime(time)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timer;