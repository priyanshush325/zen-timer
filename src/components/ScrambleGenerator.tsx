import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { randomScrambleForEvent } from 'cubing/scramble';
import PuzzleIcon from './PuzzleIcon';

interface ScrambleGeneratorProps {
  onNewScramble?: (scramble: string) => void;
  onCubeTypeChange?: (cubeType: string) => void;
}

export interface ScrambleGeneratorRef {
  newScramble: () => void;
  previousScramble: () => void;
  nextScramble: () => void;
  getCurrentScramble: () => string;
  getCurrentCubeType: () => string;
}

const ScrambleGenerator = forwardRef<ScrambleGeneratorRef, ScrambleGeneratorProps>(({ onNewScramble, onCubeTypeChange }, ref) => {
  const [scramble, setScramble] = useState('');
  const [scrambleHistory, setScrambleHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cubeType, setCubeType] = useState('333');
  const [showCubeSelector, setShowCubeSelector] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const generateScramble = async (): Promise<string> => {
    try {
      // Generate scramble using cubing library for current cube type
      const scramble = await randomScrambleForEvent(cubeType);
      return scramble.toString();
    } catch (error) {
      console.error(`Failed to generate scramble for ${cubeType} with cubing library:`, error);
      // Display error message to user if scramble generation fails
      return 'Error Generating Scramble';
    }
  };

  const newScramble = async () => {
    const newScrambleString = await generateScramble();
    setScramble(newScrambleString);
    
    // Add to history and reset index to 0 (most recent)
    setScrambleHistory(prev => [newScrambleString, ...prev.slice(0, 49)]);
    setCurrentIndex(0);
    
    if (onNewScramble) {
      onNewScramble(newScrambleString);
    }
  };

  const previousScramble = () => {
    if (currentIndex < scrambleHistory.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setScramble(scrambleHistory[newIndex]);
    }
  };

  const nextScramble = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setScramble(scrambleHistory[newIndex]);
    } else {
      // Generate a new scramble if we're at the most recent scramble
      newScramble();
    }
  };

  const getCurrentScramble = () => scramble;
  const getCurrentCubeType = () => cubeType;

  const handleCubeTypeChange = (newCubeType: string) => {
    setCubeType(newCubeType);
    setShowCubeSelector(false);
    // Clear history when changing cube type
    setScrambleHistory([]);
    setCurrentIndex(0);
    if (onCubeTypeChange) {
      onCubeTypeChange(newCubeType);
    }
  };

  useImperativeHandle(ref, () => ({
    newScramble,
    previousScramble,
    nextScramble,
    getCurrentScramble,
    getCurrentCubeType
 }));

  useEffect(() => {
    newScramble();
  }, []);

  // Generate new scramble when cube type changes
  useEffect(() => {
    if (cubeType) {
      newScramble();
    }
  }, [cubeType]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCubeSelector(false);
      }
    };

    if (showCubeSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showCubeSelector]);

  const cubeOptions = [
    { value: '222', label: '2x2x2' },
    { value: '333', label: '3x3x3' },
    { value: '444', label: '4x4x4' },
    { value: '555', label: '5x5x5' },
    { value: '666', label: '6x6x6' },
    { value: '777', label: '7x7x7' }
  ];

  return (
    <div className="mx-auto mb-8">
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={previousScramble}
          disabled={currentIndex >= scrambleHistory.length - 1}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors disabled:opacity-30"
          style={{
            background: 'rgba(0, 0, 0, 0.04)',
            color: 'var(--text-secondary)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
            }
          }}
        >
          ←
        </button>
        
        <div 
          className="text-lg font-mono leading-relaxed px-4 py-3 rounded-lg flex items-center justify-center gap-3"
          style={{ 
            background: 'rgba(0, 0, 0, 0.02)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            color: 'var(--text-primary)',
            letterSpacing: '0.05em'
          }}
        >
          {/* Puzzle Icon - Clickable */}
          <div className="flex-shrink-0 relative" ref={dropdownRef}>
            <button
              onClick={() => setShowCubeSelector(!showCubeSelector)}
              className="flex items-center justify-center transition-colors rounded p-1 hover:bg-black/5"
              title="Change cube type"
            >
              <PuzzleIcon puzzleType={cubeType} size={20} />
            </button>
            
            {/* Cube Type Selector Dropdown */}
            {showCubeSelector && (
              <div 
                className="absolute top-full left-0 mt-2 py-2 rounded-lg shadow-lg border z-50"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-medium)',
                  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.15)'
                }}
              >
                {cubeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleCubeTypeChange(option.value)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      cubeType === option.value ? 'font-medium' : ''
                    }`}
                    style={{
                      color: cubeType === option.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                      background: cubeType === option.value ? 'var(--hover-bg)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (cubeType !== option.value) {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (cubeType !== option.value) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span>{scramble}</span>
        </div>
        
        <button
          onClick={nextScramble}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
          style={{
            background: 'rgba(0, 0, 0, 0.04)',
            color: 'var(--text-secondary)',
            border: '1px solid rgba(0, 0, 0, 0.08)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
          }}
        >
          →
        </button>
      </div>
    </div>
  );
});

ScrambleGenerator.displayName = 'ScrambleGenerator';

export default ScrambleGenerator;