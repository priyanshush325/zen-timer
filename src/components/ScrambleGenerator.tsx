import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { randomScrambleForEvent } from 'cubing/scramble';
import PuzzleIcon from './PuzzleIcon';

interface ScrambleGeneratorProps {
  onNewScramble?: (scramble: string) => void;
}

export interface ScrambleGeneratorRef {
  newScramble: () => void;
  previousScramble: () => void;
  nextScramble: () => void;
  getCurrentScramble: () => string;
}

const ScrambleGenerator = forwardRef<ScrambleGeneratorRef, ScrambleGeneratorProps>(({ onNewScramble }, ref) => {
  const [scramble, setScramble] = useState('');
  const [scrambleHistory, setScrambleHistory] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const generateScramble = async (): Promise<string> => {
    try {
      // Generate 3x3x3 scramble using cubing library
      const scramble = await randomScrambleForEvent('333');
      return scramble.toString();
    } catch (error) {
      console.error('Failed to generate scramble with cubing library:', error);
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

  useImperativeHandle(ref, () => ({
    newScramble,
    previousScramble,
    nextScramble,
    getCurrentScramble
  }));

  useEffect(() => {
    newScramble();
  }, []);

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
          {/* Puzzle Icon */}
          <div className="flex-shrink-0">
            <PuzzleIcon puzzleType="333" size={20} />
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