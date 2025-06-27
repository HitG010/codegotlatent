import React from 'react';

const AvatarProgressRing = ({ progress = 70, imageComponent }) => {
  const radius = 45;
  const stroke = 2;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-28 h-28">
      <svg
        height="100%"
        width="100%"
        className="absolute top-0 left-0 transform rotate-90"
      >
        <circle
          stroke="#e2e8f020" // Tailwind's gray-200
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx="50%"
          cy="50%"
        />
        <circle
          stroke="#FFB726" // Tailwind's blue-500
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx="50%"
          cy="50%"
        />
      </svg>
      <div className="w-20 h-20 rounded-full overflow-hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white">
        {imageComponent ? (
            <img src={imageComponent} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm bg-black text-gray-600">
            ?
          </div>
        )}
      </div>
    </div>
  );
};

export default AvatarProgressRing;
