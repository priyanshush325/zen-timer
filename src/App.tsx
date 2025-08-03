import React, { useState } from 'react';
import StartupScreen from './components/StartupScreen';
import Timer from './components/Timer';

type Screen = 'startup' | 'timer';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('startup');

  const navigateToTimer = () => {
    setCurrentScreen('timer');
  };

  const navigateToStartup = () => {
    setCurrentScreen('startup');
  };

  return (
    <div className="min-h-screen">
      {currentScreen === 'startup' ? (
        <StartupScreen onGetStarted={navigateToTimer} />
      ) : (
        <Timer onBackToHome={navigateToStartup} />
      )}
    </div>
  );
};

export default App;