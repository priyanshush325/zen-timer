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
      case '222':
        // 2x2 Grid Icon
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="3" y="3" width="8" height="8" fill="currentColor" opacity="0.6" />
            <rect x="13" y="3" width="8" height="8" fill="currentColor" opacity="0.6" />
            <rect x="3" y="13" width="8" height="8" fill="currentColor" opacity="0.6" />
            <rect x="13" y="13" width="8" height="8" fill="currentColor" opacity="0.6" />
          </svg>
        );
        
      case '333':
      default:
        // 3x3 Grid Icon
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
        
      case '444':
        // 4x4 Grid Icon
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="1" y="1" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="6.5" y="1" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="12" y="1" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="17.5" y="1" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="1" y="6.5" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="6.5" y="6.5" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="12" y="6.5" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="17.5" y="6.5" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="1" y="12" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="6.5" y="12" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="12" y="12" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="17.5" y="12" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="1" y="17.5" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="6.5" y="17.5" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="12" y="17.5" width="5" height="5" fill="currentColor" opacity="0.6" />
            <rect x="17.5" y="17.5" width="5" height="5" fill="currentColor" opacity="0.6" />
          </svg>
        );
        
      case '555':
        // 5x5 Grid Icon
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="1" y="1" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="5.5" y="1" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="10" y="1" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="14.5" y="1" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="19" y="1" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="1" y="5.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="5.5" y="5.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="10" y="5.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="14.5" y="5.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="19" y="5.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="1" y="10" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="5.5" y="10" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="10" y="10" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="14.5" y="10" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="19" y="10" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="1" y="14.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="5.5" y="14.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="10" y="14.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="14.5" y="14.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="19" y="14.5" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="1" y="19" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="5.5" y="19" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="10" y="19" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="14.5" y="19" width="4" height="4" fill="currentColor" opacity="0.6" />
            <rect x="19" y="19" width="4" height="4" fill="currentColor" opacity="0.6" />
          </svg>
        );
        
      case '666':
        // 6x6 Grid Icon - 36 squares with balanced spacing
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="1" y="1" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="4.6" y="1" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="8.2" y="1" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="11.8" y="1" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="15.4" y="1" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="19" y="1" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="1" y="4.6" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="4.6" y="4.6" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="8.2" y="4.6" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="11.8" y="4.6" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="15.4" y="4.6" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="19" y="4.6" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="1" y="8.2" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="4.6" y="8.2" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="8.2" y="8.2" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="11.8" y="8.2" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="15.4" y="8.2" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="19" y="8.2" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="1" y="11.8" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="4.6" y="11.8" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="8.2" y="11.8" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="11.8" y="11.8" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="15.4" y="11.8" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="19" y="11.8" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="1" y="15.4" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="4.6" y="15.4" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="8.2" y="15.4" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="11.8" y="15.4" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="15.4" y="15.4" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="19" y="15.4" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="1" y="19" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="4.6" y="19" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="8.2" y="19" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="11.8" y="19" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="15.4" y="19" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
            <rect x="19" y="19" width="3.2" height="3.2" fill="currentColor" opacity="0.6" />
          </svg>
        );

      case '777':
        // 7x7 Grid Icon - 49 squares with balanced spacing
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
            <rect x="1" y="1" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="4.0" y="1" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="7.0" y="1" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="10.0" y="1" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="13.0" y="1" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="16.0" y="1" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="19.0" y="1" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="1" y="4.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="4.0" y="4.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="7.0" y="4.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="10.0" y="4.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="13.0" y="4.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="16.0" y="4.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="19.0" y="4.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="1" y="7.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="4.0" y="7.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="7.0" y="7.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="10.0" y="7.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="13.0" y="7.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="16.0" y="7.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="19.0" y="7.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="1" y="10.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="4.0" y="10.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="7.0" y="10.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="10.0" y="10.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="13.0" y="10.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="16.0" y="10.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="19.0" y="10.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="1" y="13.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="4.0" y="13.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="7.0" y="13.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="10.0" y="13.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="13.0" y="13.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="16.0" y="13.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="19.0" y="13.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="1" y="16.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="4.0" y="16.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="7.0" y="16.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="10.0" y="16.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="13.0" y="16.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="16.0" y="16.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="19.0" y="16.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="1" y="19.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="4.0" y="19.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="7.0" y="19.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="10.0" y="19.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="13.0" y="19.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="16.0" y="19.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
            <rect x="19.0" y="19.0" width="2.8" height="2.8" fill="currentColor" opacity="0.6" />
          </svg>
        );
    }
  };

  return getPuzzleIcon(puzzleType);
};

export default PuzzleIcon;