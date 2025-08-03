import React from 'react';

const SimpleIcon: React.FC = () => {
  return (
    <div className="w-16 h-16 mx-auto mb-12 flex items-center justify-center">
      <div 
        className="w-12 h-12 rounded-lg flex items-center justify-center"
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
    </div>
  );
};

export default SimpleIcon;