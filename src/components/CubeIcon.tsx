import React from 'react';

const CubeIcon: React.FC = () => {
  return (
    <div className="cube-container mb-12">
      <div className="cube animate-spin-slow">
        <div className="face front"></div>
        <div className="face back"></div>
        <div className="face right"></div>
        <div className="face left"></div>
        <div className="face top"></div>
        <div className="face bottom"></div>
      </div>
    </div>
  );
};

export default CubeIcon;