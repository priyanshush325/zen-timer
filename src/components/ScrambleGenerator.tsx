import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';

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

  const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', "'", '2'];

  const generateScramble = (): string => {
    const moves: string[] = [];
    let lastFace = '';
    let lastAxis = '';

    const getAxis = (face: string): string => {
      switch (face) {
        case 'R':
        case 'L':
          return 'x';
        case 'U':
        case 'D':
          return 'y';
        case 'F':
        case 'B':
          return 'z';
        default:
          return '';
      }
    };

    const getOppositeFace = (face: string): string => {
      switch (face) {
        case 'R': return 'L';
        case 'L': return 'R';
        case 'U': return 'D';
        case 'D': return 'U';
        case 'F': return 'B';
        case 'B': return 'F';
        default: return '';
      }
    };

    for (let i = 0; i < 25; i++) {
      let face: string;
      let attempts = 0;
      
      do {
        face = faces[Math.floor(Math.random() * faces.length)];
        attempts++;
      } while (
        attempts < 10 && 
        (face === lastFace || 
         (i > 0 && getAxis(face) === lastAxis && 
          (face === getOppositeFace(lastFace) || lastFace === getOppositeFace(face))))
      );

      const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
      moves.push(face + modifier);
      
      lastFace = face;
      lastAxis = getAxis(face);
    }

    return moves.join(' ');
  };

  const newScramble = () => {
    const newScrambleString = generateScramble();
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
          {/* 3x3 Grid Icon */}
          <div className="flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              {/* 3x3 grid of squares */}
              <rect x="2" y="2" width="6" height="6" fill="currentColor" opacity="0.6" />
              <rect x="9" y="2" width="6" height="6" fill="currentColor" opacity="0.6" />
              <rect x="16" y="2" width="6" height="6" fill="currentColor" opacity="0.6" />
              <rect x="2" y="9" width="6" height="6" fill="currentColor" opacity="0.6" />
              <rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.6" />
              <rect x="16" y="9" width="6" height="6" fill="currentColor" opacity="0.6" />
              <rect x="2" y="16" width="6" height="6" fill="currentColor" opacity="0.6" />
              <rect x="9" y="16" width="6" height="6" fill="currentColor" opacity="0.6" />
              <rect x="16" y="16" width="6" height="6" fill="currentColor" opacity="0.6" />
            </svg>
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