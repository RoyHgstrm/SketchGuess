import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'indigo', 
  overlay = false, 
  text = null,
  type = 'spinner' // 'spinner', 'pulse', 'dots', 'bounce'
}) => {
  // Size options
  const sizes = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
    '2xl': 'h-24 w-24',
  };
  
  // Color options for the spinner
  const colors = {
    indigo: 'text-indigo-500',
    purple: 'text-purple-500',
    blue: 'text-blue-500',
    green: 'text-green-500',
    red: 'text-red-500',
    yellow: 'text-yellow-500',
    white: 'text-white',
    gray: 'text-gray-500',
  };
  
  // Spinner (circular loading animation)
  const spinnerElement = (
    <svg 
      className={`${sizes[size]} ${colors[color]} animate-spin`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      ></circle>
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
  
  // Pulse (pulsing dots)
  const pulseElement = (
    <div className="flex space-x-2">
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-2 w-2' : sizes[size] === 'h-5 w-5' ? 'h-2.5 w-2.5' : sizes[size] === 'h-8 w-8' ? 'h-3 w-3' : sizes[size] === 'h-12 w-12' ? 'h-4 w-4' : sizes[size] === 'h-16 w-16' ? 'h-5 w-5' : 'h-6 w-6'} rounded-full ${colors[color]} animate-pulse-slow`}></div>
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-2 w-2' : sizes[size] === 'h-5 w-5' ? 'h-2.5 w-2.5' : sizes[size] === 'h-8 w-8' ? 'h-3 w-3' : sizes[size] === 'h-12 w-12' ? 'h-4 w-4' : sizes[size] === 'h-16 w-16' ? 'h-5 w-5' : 'h-6 w-6'} rounded-full ${colors[color]} animate-pulse-slow delay-75`}></div>
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-2 w-2' : sizes[size] === 'h-5 w-5' ? 'h-2.5 w-2.5' : sizes[size] === 'h-8 w-8' ? 'h-3 w-3' : sizes[size] === 'h-12 w-12' ? 'h-4 w-4' : sizes[size] === 'h-16 w-16' ? 'h-5 w-5' : 'h-6 w-6'} rounded-full ${colors[color]} animate-pulse-slow delay-150`}></div>
    </div>
  );
  
  // Dots (fading dots)
  const dotsElement = (
    <div className="flex space-x-1">
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-1.5 w-1.5' : sizes[size] === 'h-5 w-5' ? 'h-2 w-2' : sizes[size] === 'h-8 w-8' ? 'h-2.5 w-2.5' : sizes[size] === 'h-12 w-12' ? 'h-3 w-3' : sizes[size] === 'h-16 w-16' ? 'h-4 w-4' : 'h-5 w-5'} rounded-full ${colors[color]} animate-fade-in-out`}></div>
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-1.5 w-1.5' : sizes[size] === 'h-5 w-5' ? 'h-2 w-2' : sizes[size] === 'h-8 w-8' ? 'h-2.5 w-2.5' : sizes[size] === 'h-12 w-12' ? 'h-3 w-3' : sizes[size] === 'h-16 w-16' ? 'h-4 w-4' : 'h-5 w-5'} rounded-full ${colors[color]} animate-fade-in-out animation-delay-200`}></div>
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-1.5 w-1.5' : sizes[size] === 'h-5 w-5' ? 'h-2 w-2' : sizes[size] === 'h-8 w-8' ? 'h-2.5 w-2.5' : sizes[size] === 'h-12 w-12' ? 'h-3 w-3' : sizes[size] === 'h-16 w-16' ? 'h-4 w-4' : 'h-5 w-5'} rounded-full ${colors[color]} animate-fade-in-out animation-delay-400`}></div>
    </div>
  );
  
  // Bounce (bouncing balls)
  const bounceElement = (
    <div className="flex items-center space-x-1">
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-1.5 w-1.5' : sizes[size] === 'h-5 w-5' ? 'h-2 w-2' : sizes[size] === 'h-8 w-8' ? 'h-2.5 w-2.5' : sizes[size] === 'h-12 w-12' ? 'h-3 w-3' : sizes[size] === 'h-16 w-16' ? 'h-4 w-4' : 'h-5 w-5'} rounded-full ${colors[color]} animate-bounce-slow`}></div>
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-1.5 w-1.5' : sizes[size] === 'h-5 w-5' ? 'h-2 w-2' : sizes[size] === 'h-8 w-8' ? 'h-2.5 w-2.5' : sizes[size] === 'h-12 w-12' ? 'h-3 w-3' : sizes[size] === 'h-16 w-16' ? 'h-4 w-4' : 'h-5 w-5'} rounded-full ${colors[color]} animate-bounce-slow animation-delay-200`}></div>
      <div className={`${sizes[size] === 'h-4 w-4' ? 'h-1.5 w-1.5' : sizes[size] === 'h-5 w-5' ? 'h-2 w-2' : sizes[size] === 'h-8 w-8' ? 'h-2.5 w-2.5' : sizes[size] === 'h-12 w-12' ? 'h-3 w-3' : sizes[size] === 'h-16 w-16' ? 'h-4 w-4' : 'h-5 w-5'} rounded-full ${colors[color]} animate-bounce-slow animation-delay-400`}></div>
    </div>
  );

  // Select loader type
  let loader;
  switch (type) {
    case 'pulse':
      loader = pulseElement;
      break;
    case 'dots':
      loader = dotsElement;
      break;
    case 'bounce':
      loader = bounceElement;
      break;
    case 'spinner':
    default:
      loader = spinnerElement;
      break;
  }

  // Container with loader and optional text
  const loadingElement = (
    <div className="flex flex-col items-center justify-center">
      {loader}
      
      {text && (
        <p className={`mt-3 text-sm font-medium ${colors[color]}`}>
          {text}
        </p>
      )}
    </div>
  );

  // If overlay is true, show spinner over a semi-transparent background
  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm" role="status" aria-live="polite">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl animate-pop-in">
          {loadingElement}
        </div>
      </div>
    );
  }

  // Otherwise, just return the spinner
  return <div role="status" aria-live="polite">{loadingElement}</div>;
};

export default LoadingSpinner; 