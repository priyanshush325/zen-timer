import React from 'react';
import ImportTimes from './ImportTimes';

export interface SettingsData {
  holdDuration: number; // in milliseconds
  useInspection: boolean;
  timerFontSize: number; // 1-5 scale (small to extra large)
  averageFontSize: number; // 1-5 scale (small to extra large)
}

interface SettingsProps {
  settings: SettingsData;
  onSettingsChange: (newSettings: SettingsData) => void;
  onClose: () => void;
  theme: 'light' | 'dark';
  isFocused: boolean;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, 
  onSettingsChange, 
  onClose, 
  theme,
  isFocused
}) => {
  const [manualInput, setManualInput] = React.useState('');
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

  const handleHoldDurationChange = (value: number) => {
    onSettingsChange({
      ...settings,
      holdDuration: value
    });
  };

  const handleManualInputChange = (value: string) => {
    setManualInput(value);
  };

  const handleManualInputSubmit = () => {
    const numValue = parseInt(manualInput);
    if (!isNaN(numValue) && numValue >= 0) {
      handleHoldDurationChange(numValue);
    }
    setManualInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualInputSubmit();
    }
  };

  const handleInspectionToggle = () => {
    onSettingsChange({
      ...settings,
      useInspection: !settings.useInspection
    });
  };

  const handleTimerFontSizeChange = (value: number) => {
    onSettingsChange({
      ...settings,
      timerFontSize: value
    });
  };

  const handleAverageFontSizeChange = (value: number) => {
    onSettingsChange({
      ...settings,
      averageFontSize: value
    });
  };

  const getFontSizeLabel = (size: number): string => {
    const labels = ['XS', 'S', 'M', 'L', 'XL'];
    return labels[size - 1] || 'M';
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300"
      style={{ opacity: isFocused ? 0.3 : 1 }}
      onClick={onClose}
    >
      <div 
        className="rounded-xl max-w-md w-full mx-4 shadow-2xl max-h-[80vh] flex flex-col"
        style={{ 
          background: 'var(--bg-primary)',
          ...themeVars
        } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Settings
          </h2>
          <button
            onClick={onClose}
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

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-4">
          {/* Hold Duration Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label 
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Hold Duration
              </label>
              <span 
                className="text-sm font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                {settings.holdDuration}ms
              </span>
            </div>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={settings.holdDuration}
                onChange={(e) => handleHoldDurationChange(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #22c55e 0%, #22c55e ${(settings.holdDuration / 2000) * 100}%, var(--gray-100) ${(settings.holdDuration / 2000) * 100}%, var(--gray-100) 100%)`
                }}
              />
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span>0ms</span>
                <span>Quick</span>
                <span>Normal</span>
                <span>Slow</span>
                <span>2000ms</span>
              </div>
              
              {/* Manual input */}
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  placeholder="Enter ms"
                  value={manualInput}
                  onChange={(e) => handleManualInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-3 py-2 rounded-lg text-sm border transition-colors"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#22c55e';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-medium)';
                  }}
                />
                <button
                  onClick={handleManualInputSubmit}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: '#22c55e',
                    color: '#ffffff'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#16a34a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#22c55e';
                  }}
                >
                  Set
                </button>
              </div>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              How long to hold spacebar before the timer starts. Use 0ms for instant start.
            </div>
          </div>

          {/* Inspection Time Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label 
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Inspection Time
              </label>
              <button
                onClick={handleInspectionToggle}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none"
                style={{
                  background: settings.useInspection ? '#22c55e' : 'var(--gray-100)'
                }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                  style={{
                    transform: settings.useInspection ? 'translateX(26px)' : 'translateX(2px)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </button>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {settings.useInspection 
                ? 'Enable 15-second inspection period before solving'
                : 'Start timing immediately when spacebar is released'
              }
            </div>
          </div>

          {/* Timer Font Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label 
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Timer Font Size
              </label>
              <span 
                className="text-sm font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                {getFontSizeLabel(settings.timerFontSize)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={settings.timerFontSize}
              onChange={(e) => handleTimerFontSizeChange(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((settings.timerFontSize - 1) / 4) * 100}%, var(--gray-100) ${((settings.timerFontSize - 1) / 4) * 100}%, var(--gray-100) 100%)`
              }}
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>XS</span>
              <span>S</span>
              <span>M</span>
              <span>L</span>
              <span>XL</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Adjust the size of the main timer display
            </div>
          </div>

          {/* Average Font Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label 
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Average Font Size
              </label>
              <span 
                className="text-sm font-mono"
                style={{ color: 'var(--text-secondary)' }}
              >
                {getFontSizeLabel(settings.averageFontSize)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={settings.averageFontSize}
              onChange={(e) => handleAverageFontSizeChange(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((settings.averageFontSize - 1) / 4) * 100}%, var(--gray-100) ${((settings.averageFontSize - 1) / 4) * 100}%, var(--gray-100) 100%)`
              }}
            />
            <div className="flex justify-between text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>XS</span>
              <span>S</span>
              <span>M</span>
              <span>L</span>
              <span>XL</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Adjust the size of average times (Ao5, Ao12)
            </div>
          </div>

          {/* Import Times */}
          <ImportTimes 
            theme={theme}
          />
          </div>
        </div>

        <div 
          className="pt-4 px-6 pb-6 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border-light)' }}
        >
          <div className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
            Press{' '}
            <kbd 
              className="px-1.5 py-0.5 rounded text-xs font-medium mx-1" 
              style={{ 
                background: 'var(--gray-100)',
                color: 'var(--text-primary)'
              }}
            >
              ESC
            </kbd>{' '}
            to close settings
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          input[type="range"] {
            -webkit-appearance: none;
          }
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          input[type="range"]::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          /* Green slider for hold duration */
          input[type="range"][min="0"][max="2000"]::-webkit-slider-thumb {
            background: #22c55e;
          }
          input[type="range"][min="0"][max="2000"]::-moz-range-thumb {
            background: #22c55e;
          }
          /* Blue slider for timer font size */
          input[type="range"][min="1"][max="5"][value]::-webkit-slider-thumb {
            background: #3b82f6;
          }
          input[type="range"][min="1"][max="5"][value]::-moz-range-thumb {
            background: #3b82f6;
          }
          /* Purple slider for average font size - target by specific gradient color */
          input[type="range"]:has(+ .flex .text-xs:contains("average"))::-webkit-slider-thumb {
            background: #8b5cf6;
          }
        `
      }} />
    </div>
  );
};

export default Settings;