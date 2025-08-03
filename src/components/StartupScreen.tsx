import React from 'react';
import SimpleIcon from './GeometricPattern';

const StartupScreen: React.FC = () => {
  const handleGetStarted = () => {
    console.log('Get Started clicked!');
    // TODO: Navigate to timer view
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative px-8">
      {/* Main Content */}
      <div className="text-center max-w-2xl mx-auto">
        {/* Hero Content */}
        <div className="animate-slide-up mb-16" style={{ animationDelay: '0.1s' }}>
          <div className="mb-12">
            {/* Title with Inline Icon */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <div 
                  className="w-6 h-6 rounded-sm"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)'
                  }}
                />
              </div>
              <h1 
                className="text-6xl md:text-7xl font-bold"
                style={{ 
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                  lineHeight: '1.1',
                  letterSpacing: '-0.02em',
                  fontWeight: '700'
                }}
              >
                Zen Timer
              </h1>
            </div>
          </div>
          
          <p 
            className="text-xl md:text-2xl leading-relaxed max-w-2xl mx-auto"
            style={{ 
              color: 'var(--text-secondary)',
              lineHeight: '1.7',
              fontWeight: '400'
            }}
          >
            Everything you need for focused speedcubing practice.{' '}
            <br className="hidden md:block" />
            Built-in{' '}
            <em style={{ color: 'var(--accent-primary)', fontStyle: 'normal', fontWeight: '500' }}>media controls</em>,{' '}
            <em style={{ color: 'var(--accent-secondary)', fontStyle: 'normal', fontWeight: '500' }}>analytics</em>, and{' '}
            <em style={{ color: 'var(--accent-cool)', fontStyle: 'normal', fontWeight: '500' }}>customization</em>{' '}
            — distraction-free.
          </p>
        </div>
        
        {/* CTA */}
        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <button 
            onClick={handleGetStarted}
            className="px-8 py-4 rounded-lg text-base font-semibold transition-all duration-200"
            style={{
              background: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              fontFamily: 'var(--font-display)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-primary-hover)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Get Started
          </button>
        </div>
      </div>
      
      {/* Footer */}
      <div 
        className="absolute bottom-8 text-center text-sm"
        style={{ 
          color: 'var(--text-tertiary)'
        }}
      >
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
        to start timing
      </div>
    </div>
  );
};

export default StartupScreen;