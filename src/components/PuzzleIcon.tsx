import React from 'react';

interface PuzzleIconProps {
  puzzleType?: string;
  size?: number;
  className?: string;
}

const PuzzleIcon: React.FC<PuzzleIconProps> = ({ 
  puzzleType = '333', 
  size = 16, 
  className = '' 
}) => {
  const getPuzzleIcon = (type: string) => {
    switch (type) {
      case '333':
      default:
        // 3x3 Grid Icon (same as scramble generator)
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
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
        );
        
      // Future puzzle types can be added here:
      // case '222':
      //   return (2x2 grid icon);
      // case '444':
      //   return (4x4 grid icon);
      // case 'pyra':
      //   return (pyramid icon);
      // etc.
    }
  };

  return getPuzzleIcon(puzzleType);
};

export default PuzzleIcon;