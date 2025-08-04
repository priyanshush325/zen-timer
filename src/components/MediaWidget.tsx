import React, { useState, useEffect } from 'react';

interface MediaInfo {
  title?: string;
  artist?: string;
  artwork?: string;
  isPlaying?: boolean;
  position?: number;
  duration?: number;
  volume?: number;
}

interface MediaWidgetProps {
  isFocused: boolean;
  theme: 'light' | 'dark';
}

// Declare the Electron API that we'll add to the main process
declare global {
  interface Window {
    electronAPI?: {
      getCurrentMedia: () => Promise<MediaInfo | null>;
      playPauseMedia: () => Promise<boolean>;
      nextTrack: () => Promise<boolean>;
      previousTrack: () => Promise<boolean>;
      setVolume: (volume: number) => Promise<boolean>;
      onMediaChange: (callback: (media: MediaInfo | null) => void) => void;
      removeMediaListeners: () => void;
    };
  }
}

const MediaWidget: React.FC<MediaWidgetProps> = ({ isFocused, theme }) => {
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [isElectron, setIsElectron] = useState(false);

  // Theme variables for MediaWidget
  const bgColor = theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(31, 31, 31, 0.95)';
  const borderColor = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';
  const textPrimary = theme === 'light' ? '#000000' : '#ffffff';
  const textSecondary = theme === 'light' ? '#666666' : '#a3a3a3';
  const buttonBg = theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)';
  const buttonBgHover = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';
  const buttonBorder = theme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

  useEffect(() => {
    // Check if we're running in Electron
    const checkElectron = () => {
      return typeof window !== 'undefined' && window.electronAPI;
    };

    setIsElectron(!!checkElectron());

    if (checkElectron()) {
      // Use Electron API to get system media
      const updateMediaInfo = async () => {
        try {
          const media = await window.electronAPI!.getCurrentMedia();
          setMediaInfo(media);
        } catch (error) {
          console.error('Failed to get media info:', error);
          setMediaInfo(null);
        }
      };

      // Initial check
      updateMediaInfo();

      // Listen for media changes
      window.electronAPI!.onMediaChange((media) => {
        setMediaInfo(media);
      });

      // Fallback polling every 3 seconds for more responsive updates
      const interval = setInterval(updateMediaInfo, 3000);

      return () => {
        clearInterval(interval);
        window.electronAPI!.removeMediaListeners();
      };
    } else {
      // Fallback for web (show placeholder)
      setMediaInfo({
        title: 'Electron Required',
        artist: 'System media access needs Electron',
        isPlaying: false
      });
    }
  }, []);

  const handlePlayPause = async () => {
    if (isElectron && window.electronAPI) {
      try {
        await window.electronAPI.playPauseMedia();
        // Update media info immediately after action
        setTimeout(async () => {
          const media = await window.electronAPI!.getCurrentMedia();
          setMediaInfo(media);
        }, 200);
      } catch (error) {
        console.error('Failed to play/pause:', error);
      }
    }
  };

  const handleNext = async () => {
    if (isElectron && window.electronAPI) {
      try {
        await window.electronAPI.nextTrack();
        // Update media info after track change
        setTimeout(async () => {
          const media = await window.electronAPI!.getCurrentMedia();
          setMediaInfo(media);
        }, 500);
      } catch (error) {
        console.error('Failed to skip:', error);
      }
    }
  };

  const handlePrevious = async () => {
    if (isElectron && window.electronAPI) {
      try {
        await window.electronAPI.previousTrack();
        // Update media info after track change
        setTimeout(async () => {
          const media = await window.electronAPI!.getCurrentMedia();
          setMediaInfo(media);
        }, 500);
      } catch (error) {
        console.error('Failed to go to previous:', error);
      }
    }
  };


  // Don't show widget if no media info
  if (!mediaInfo || !mediaInfo.title) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-20 right-6 z-40 transition-all duration-300"
      style={{
        opacity: isFocused ? 0 : 1,
        transform: isFocused ? 'translateY(10px)' : 'translateY(0)'
      }}
    >
      <div 
        className="rounded-xl border p-4 w-80"
        style={{
          background: bgColor,
          backdropFilter: 'blur(12px)',
          borderColor: borderColor,
          boxShadow: theme === 'light' ? '0 4px 20px rgba(0, 0, 0, 0.08)' : '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
      >
        {/* Track info section */}
        <div className="flex items-center gap-3 mb-3">
          {mediaInfo.artwork && (
            <div className="flex-shrink-0">
              <img 
                src={mediaInfo.artwork}
                alt="Album artwork"
                className="w-12 h-12 rounded-lg object-cover"
                style={{ background: 'var(--gray-100)' }}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div 
              className="font-medium text-sm truncate"
              style={{ color: textPrimary }}
            >
              {mediaInfo.title}
            </div>
            {mediaInfo.artist && (
              <div 
                className="text-xs truncate mt-0.5"
                style={{ color: textSecondary }}
              >
                {mediaInfo.artist}
              </div>
            )}
          </div>

          {/* Playing indicator */}
          {mediaInfo.isPlaying && (
            <div className="flex-shrink-0">
              <div 
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#22c55e' }}
              />
            </div>
          )}
        </div>


        {/* Control buttons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={handlePrevious}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: buttonBg,
              color: textSecondary,
              border: `1px solid ${buttonBorder}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonBgHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: buttonBg,
              color: textSecondary,
              border: `1px solid ${buttonBorder}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonBgHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
            }}
          >
            {mediaInfo.isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: buttonBg,
              color: textSecondary,
              border: `1px solid ${buttonBorder}`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonBgHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  );
};

export default MediaWidget;