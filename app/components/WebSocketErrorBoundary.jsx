import React from 'react';

class WebSocketErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("WebSocket Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI with enhanced visuals
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-xl shadow-2xl overflow-hidden transform transition-all duration-500 animate-pop-in">
            {/* Error Header */}
            <div className="bg-gradient-to-r from-red-800 to-red-600 p-5 relative">
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-red-500 rounded-full p-4 border-4 border-gray-800 shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-center">Connection Error</h2>
            </div>
            
            {/* Error Body */}
            <div className="bg-gray-800 p-6 pt-12">
              <p className="text-gray-300 text-center mb-6">
                We've encountered an issue with the WebSocket connection. This could be due to:
              </p>
              
              <ul className="space-y-2 text-gray-400 mb-6 list-disc list-inside">
                <li>A network connectivity problem</li>
                <li>The game server may be down</li>
                <li>A temporary service interruption</li>
                <li>Your connection may have timed out</li>
              </ul>
              
              <div className="bg-gray-900 rounded-lg p-4 mb-6 font-mono text-sm overflow-x-auto">
                <p className="text-red-400">
                  {this.state.error && (this.state.error.message || String(this.state.error))}
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:translate-y-[-1px] hover:shadow-lg"
                >
                  <div className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7.805v2.205a1 1 0 01-2 0V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H16a1 1 0 110 2H5a1 1 0 01-1-1v-5a1 1 0 011-1h2.5a1 1 0 110 2h-.395a6.973 6.973 0 00-2.097 1.057z" clipRule="evenodd" />
                    </svg>
                    Refresh Page
                  </div>
                </button>
                
                <button 
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Try Again
                </button>
              </div>
            </div>
            
            <div className="border-t border-gray-700 bg-gray-800 px-6 py-4">
              <p className="text-sm text-gray-500 text-center">
                If the problem persists, please try again later or
                contact support for assistance.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebSocketErrorBoundary; 