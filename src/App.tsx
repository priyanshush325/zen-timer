import React, { useState, useEffect } from 'react';
import StartupScreen from './components/StartupScreen';
import Timer from './components/Timer';

type Screen = 'startup' | 'timer';

const App: React.FC = () => {
  // Check if user has seen the startup screen before
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const hasSeenStartup = localStorage.getItem('zen-timer-seen-startup');
    return hasSeenStartup ? 'timer' : 'startup';
  });

  const navigateToTimer = () => {
    // Mark that user has seen the startup screen
    localStorage.setItem('zen-timer-seen-startup', 'true');
    setCurrentScreen('timer');
  };

  return (
    <div className="min-h-screen">
      {currentScreen === 'startup' ? (
        <StartupScreen onGetStarted={navigateToTimer} />
      ) : (
        <Timer />
      )}
    </div>
  );
};

export default App;