import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '~/context/WebSocketContext';

interface DrawingCanvasProps {
  darkMode: boolean;
}

// Define the structure for a drawing action
interface DrawingAction {
  type: 'draw' | 'clear';
  // Use normalized coordinates (0-1 range)
  normX?: number;
  normY?: number;
  prevNormX?: number;
  prevNormY?: number;
  color?: string;
  lineWidth?: number;
  // Flag for starting a new line segment
  isNewLine?: boolean; 
  // Timestamp for potential future ordering/syncing improvements
  timestamp?: number; 
}

declare global {
  interface Window {
    resizeTimeout?: NodeJS.Timeout;
  }
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ darkMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const { handleDraw, gameState, currentPlayer } = useWebSocket();
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill'>('brush');
  const lastPointRef = useRef<{ normX: number; normY: number } | null>(null);
  const canvasSizeRef = useRef({ width: 800, height: 450 }); // Default size
  
  // Store drawing history as an array of actions
  const drawingHistoryRef = useRef<DrawingAction[]>([]);

  // Determine if the current player can draw by comparing IDs
  const canDraw = gameState?.drawer?.id === currentPlayer?.id && gameState?.status === 'playing';

  // Add debugging for drawer status
  useEffect(() => {
    // Log comparison specifically when status is playing
    if (gameState?.status === 'playing') {
      console.log('DrawingCanvas - Drawer check:', {
        gs_drawerId: gameState?.drawer?.id,
        cp_playerId: currentPlayer?.id,
        calc_canDraw: gameState?.drawer?.id === currentPlayer?.id, // Log the direct comparison result
        gs_status: gameState?.status,
        final_canDraw: canDraw, // Log the final state variable value
        gs_word: gameState?.word // Log the word from gameState
      });
    }
  }, [gameState?.status, gameState?.drawer?.id, currentPlayer?.id, canDraw, gameState?.word]);

  // Function to clear the canvas with a background color
  const clearCanvas = useCallback((context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    context.fillStyle = '#FFFFFF'; // Always clear with white background
    context.fillRect(0, 0, canvasSizeRef.current.width, canvasSizeRef.current.height);
  }, []);

  // Function to redraw the entire canvas from history
  const redrawCanvasFromHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    console.log(`Redrawing canvas from history (${drawingHistoryRef.current.length} actions)`);
    clearCanvas(context, canvas);

    drawingHistoryRef.current.forEach(action => {
      if (action.type === 'clear') {
        clearCanvas(context, canvas);
      } else if (action.type === 'draw' && action.normX !== undefined && action.normY !== undefined) {
        context.strokeStyle = action.color || '#000000';
        context.lineWidth = action.lineWidth || 5;
        
        // Convert normalized coordinates back to local coordinates
        const currentX = action.normX * canvasSizeRef.current.width;
        const currentY = action.normY * canvasSizeRef.current.height;
        
        if (action.isNewLine) {
          context.beginPath();
          context.moveTo(currentX, currentY);
        } else if (action.prevNormX !== undefined && action.prevNormY !== undefined) {
          const prevX = action.prevNormX * canvasSizeRef.current.width;
          const prevY = action.prevNormY * canvasSizeRef.current.height;
          context.lineTo(currentX, currentY);
          context.stroke();
        } else {
          // If not a new line but missing previous points, just draw a dot
          context.beginPath();
          context.arc(currentX, currentY, context.lineWidth / 2, 0, Math.PI * 2);
          context.fillStyle = context.strokeStyle;
          context.fill();
        }
      }
    });
  }, [clearCanvas]);

  // Update canvas dimensions while maintaining the drawing history
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const containerRect = container.getBoundingClientRect();
    const FIXED_ASPECT_RATIO = 16 / 9;
    const MAX_WIDTH = Math.min(1200, containerRect.width * 0.98); // Use more width
    const MAX_HEIGHT = Math.min(700, containerRect.height * 0.98); // Use more height

    let canvasWidth, canvasHeight;
    if (MAX_WIDTH / FIXED_ASPECT_RATIO <= MAX_HEIGHT) {
      canvasWidth = MAX_WIDTH;
      canvasHeight = canvasWidth / FIXED_ASPECT_RATIO;
    } else {
      canvasHeight = MAX_HEIGHT;
      canvasWidth = canvasHeight * FIXED_ASPECT_RATIO;
    }

    canvasWidth = Math.max(canvasWidth, 320);
    canvasHeight = Math.max(canvasHeight, 180);

    // Check if dimensions actually changed to avoid unnecessary redraws
    if (canvasSizeRef.current.width === canvasWidth && canvasSizeRef.current.height === canvasHeight) {
      // console.log('Canvas dimensions unchanged, skipping redraw.');
      return;
    }

    console.log(`Updating canvas dimensions to ${canvasWidth}x${canvasHeight}`);
    canvasSizeRef.current = { width: canvasWidth, height: canvasHeight };

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * pixelRatio;
    canvas.height = canvasHeight * pixelRatio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.marginLeft = 'auto';
    canvas.style.marginRight = 'auto';

    const context = canvas.getContext('2d');
    if (!context) return;

    context.scale(pixelRatio, pixelRatio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    contextRef.current = context;

    // Redraw the canvas from history instead of using image data
    redrawCanvasFromHistory();

  }, [redrawCanvasFromHistory]); // Dependency on redraw function

  // Declare a resize timeout reference
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize canvas and set up resize observer
  useEffect(() => {
    // Define resize handler function inside useEffect
    const handleResize = () => {
      // Debounce resize
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        updateCanvasDimensions();
      }, 250); // Slightly longer debounce
    };

    // Initial setup
    updateCanvasDimensions();

    // Set up resize observer
    let observer: ResizeObserver | null = null;
    if (containerRef.current) {
      observer = new ResizeObserver(handleResize);
      observer.observe(containerRef.current);
    }

    // Clean up
    return () => {
      if (observer) observer.disconnect();
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount, updateCanvasDimensions is stable

  // Handle receiving drawing data from WebSocket
  useEffect(() => {
    const handleDrawingData = (event: Event) => {
      const customEvent = event as CustomEvent<DrawingAction>;
      const action = customEvent.detail;

      if (!canvasRef.current || !contextRef.current) return;
      const context = contextRef.current;

      // If this client is the drawer, don't redraw its own actions
      // The drawerId check might need refinement based on server data
      // if (action.drawerId === currentPlayer?.id) return;

      console.log('Received drawing action:', action.type, action);

      // Store action in history (all clients do this)
      drawingHistoryRef.current.push(action);

      // Apply action immediately to the canvas
      if (action.type === 'clear') {
        clearCanvas(context, canvasRef.current);
      } else if (action.type === 'draw' && action.normX !== undefined && action.normY !== undefined) {
        context.strokeStyle = action.color || '#000000';
        context.lineWidth = action.lineWidth || 5;
        
        const currentX = action.normX * canvasSizeRef.current.width;
        const currentY = action.normY * canvasSizeRef.current.height;
        
        if (action.isNewLine) {
          context.beginPath();
          context.moveTo(currentX, currentY);
        } else if (action.prevNormX !== undefined && action.prevNormY !== undefined) {
          const prevX = action.prevNormX * canvasSizeRef.current.width;
          const prevY = action.prevNormY * canvasSizeRef.current.height;
          context.lineTo(currentX, currentY);
          context.stroke();
        } else {
          context.beginPath();
          context.arc(currentX, currentY, context.lineWidth / 2, 0, Math.PI * 2);
          context.fillStyle = context.strokeStyle;
          context.fill();
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('drawing-data', handleDrawingData);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('drawing-data', handleDrawingData);
      }
    };
  }, [clearCanvas]);

  // --- Drawing Event Handlers ---

  const getNormalizedCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    const clientX = ('touches' in e) ? e.touches[0].clientX : e.clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : e.clientY;
    
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    
    // Normalize coordinates to 0-1 range based on canvas display size
    const normX = Math.max(0, Math.min(1, localX / canvasSizeRef.current.width));
    const normY = Math.max(0, Math.min(1, localY / canvasSizeRef.current.height));

    return { normX, normY };
  };

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const coords = getNormalizedCoords(e);
    if (!coords || !contextRef.current) return;

    const { normX, normY } = coords;
    setIsDrawingLine(true);
    lastPointRef.current = { normX, normY };

    const effectiveColor = tool === 'eraser' ? '#FFFFFF' : currentColor;
    const effectiveLineWidth = tool === 'eraser' ? lineWidth * 2 : lineWidth; // Make eraser slightly larger

    contextRef.current.strokeStyle = effectiveColor;
    contextRef.current.lineWidth = effectiveLineWidth;
    contextRef.current.beginPath();
    contextRef.current.moveTo(normX * canvasSizeRef.current.width, normY * canvasSizeRef.current.height);

    const action: DrawingAction = {
      type: 'draw',
      normX,
      normY,
      prevNormX: normX, // For a starting point, prev is same as current
      prevNormY: normY,
      color: effectiveColor,
      lineWidth: effectiveLineWidth,
      isNewLine: true,
      timestamp: Date.now()
    };
    
    drawingHistoryRef.current.push(action);
    handleDraw(action);

  }, [canDraw, currentColor, lineWidth, tool, handleDraw]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingLine || !canDraw) return;
    const coords = getNormalizedCoords(e);
    if (!coords || !contextRef.current || !lastPointRef.current) return;

    const { normX, normY } = coords;
    const prevPoint = lastPointRef.current;

    // Only draw if position changed significantly
    if (Math.abs(normX - prevPoint.normX) < 0.001 && Math.abs(normY - prevPoint.normY) < 0.001) {
      return;
    }

    const effectiveColor = tool === 'eraser' ? '#FFFFFF' : currentColor;
    const effectiveLineWidth = tool === 'eraser' ? lineWidth * 2 : lineWidth;
    
    contextRef.current.strokeStyle = effectiveColor;
    contextRef.current.lineWidth = effectiveLineWidth;
    contextRef.current.lineTo(normX * canvasSizeRef.current.width, normY * canvasSizeRef.current.height);
    contextRef.current.stroke();
    
    lastPointRef.current = { normX, normY };

    const action: DrawingAction = {
      type: 'draw',
      normX,
      normY,
      prevNormX: prevPoint.normX,
      prevNormY: prevPoint.normY,
      color: effectiveColor,
      lineWidth: effectiveLineWidth,
      isNewLine: false,
      timestamp: Date.now()
    };
    
    drawingHistoryRef.current.push(action);
    handleDraw(action);

  }, [isDrawingLine, canDraw, tool, currentColor, lineWidth, handleDraw]);

  const stopDrawing = useCallback(() => {
    if (!contextRef.current) return;
    // contextRef.current.closePath(); // Closing path isn't needed for lineTo
    setIsDrawingLine(false);
    lastPointRef.current = null;
  }, []);

  const clearCanvasHandler = useCallback(() => {
    if (!canDraw || !canvasRef.current || !contextRef.current) return;
    
    clearCanvas(contextRef.current, canvasRef.current);
    drawingHistoryRef.current = []; // Clear history
    
    const action: DrawingAction = { type: 'clear', timestamp: Date.now() };
    handleDraw(action);
    
    console.log('Cleared canvas locally and sent clear command');
  }, [canDraw, handleDraw, clearCanvas]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col items-center justify-center">
      {/* Game status bar */}
      {gameState?.status === 'playing' && (
        <div className={`absolute top-2 left-2 right-2 z-10 p-3 rounded-lg shadow-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} ${ 
          canDraw 
            ? 'bg-green-500/20 border border-green-500/30' 
            : 'bg-blue-500/20 border border-blue-500/30'
        }`}>
          {canDraw ? (
            <div className="flex items-center">
              <span className="font-medium text-green-400 mr-2">Your turn to draw:</span>
              <span className="bg-gray-800 text-white px-3 py-1 rounded-lg font-bold">
                {gameState.word ? gameState.word : 'Loading...'}
              </span>
            </div>
          ) : (
            <div className="text-blue-400">
              {gameState?.drawer?.name || 'Someone'} is drawing... Guess the word!
            </div>
          )}
        </div>
      )}

      {/* Canvas Element - Positioned Centrally */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing} // Stop drawing if mouse leaves canvas
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className={`rounded-lg shadow-lg ${canDraw ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        style={{ touchAction: 'none' }} // Prevent default touch actions like scrolling
      />

      {/* Drawing tools - Only show if current player is the drawer */}
      {canDraw && gameState?.status === 'playing' && (
        <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 p-2 sm:p-3 rounded-lg shadow-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} max-w-[95%]`}>
          {/* Tool groups - maybe wrap them */}
          <div className="flex flex-wrap justify-center gap-1 border-b sm:border-b-0 sm:border-r pb-1 sm:pb-0 sm:pr-2 mb-1 sm:mb-0 sm:mr-1 border-gray-500">
            <button 
              onClick={() => setTool('brush')}
              className={`p-2 rounded-lg ${tool === 'brush' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-600/30'}`}
              title="Brush"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
              </svg>
            </button>
            <button 
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg ${tool === 'eraser' ? 'bg-indigo-500 text-white' : 'hover:bg-gray-600/30'}`}
              title="Eraser"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.50506 11.4096L6.03539 11.9399L5.50506 11.4096ZM3 14.9522H2.25H3ZM12.5904 18.4949L12.0601 17.9646L12.5904 18.4949ZM9.04776 21V21.75V21ZM11.4096 5.50506L10.8792 4.97473L11.4096 5.50506ZM13.241 17.8444C13.5339 18.1373 14.0088 18.1373 14.3017 17.8444C14.5946 17.5515 14.5946 17.0766 14.3017 16.7837L13.241 17.8444ZM7.21629 9.69832C6.9234 9.40543 6.44852 9.40543 6.15563 9.69832C5.86274 9.99122 5.86274 10.4661 6.15563 10.759L7.21629 9.69832ZM16.073 16.073C16.3659 15.7801 16.3659 15.3053 16.073 15.0124C15.7801 14.7195 15.3053 14.7195 15.0124 15.0124L16.073 16.073ZM18.4676 11.5559C18.1759 11.8499 18.1777 12.3248 18.4718 12.6165C18.7658 12.9083 19.2407 12.9064 19.5324 12.6124L18.4676 11.5559ZM6.03539 11.9399L11.9399 6.03539L10.8792 4.97473L4.97473 10.8792L6.03539 11.9399ZM6.03539 17.9646C5.18538 17.1146 4.60235 16.5293 4.22253 16.0315C3.85592 15.551 3.75 15.2411 3.75 14.9522H2.25C2.25 15.701 2.56159 16.3274 3.03 16.9414C3.48521 17.538 4.1547 18.2052 4.97473 19.0253L6.03539 17.9646ZM4.97473 10.8792C4.1547 11.6993 3.48521 12.3665 3.03 12.9631C2.56159 13.577 2.25 14.2035 2.25 14.9522H3.75C3.75 14.6633 3.85592 14.3535 4.22253 13.873C4.60235 13.3752 5.18538 12.7899 6.03539 11.9399L4.97473 10.8792ZM12.0601 17.9646C11.2101 18.8146 10.6248 19.3977 10.127 19.7775C9.64651 20.1441 9.33665 20.25 9.04776 20.25V21.75C9.79649 21.75 10.423 21.4384 11.0369 20.97C11.6335 20.5148 12.3008 19.8453 13.1208 19.0253L12.0601 17.9646ZM4.97473 19.0253C5.79476 19.8453 6.46201 20.5148 7.05863 20.97C7.67256 21.4384 8.29902 21.75 9.04776 21.75V20.25C8.75886 20.25 8.449 20.1441 7.9685 19.7775C7.47069 19.3977 6.88541 18.8146 6.03539 17.9646L4.97473 19.0253ZM17.9646 6.03539C18.8146 6.88541 19.3977 7.47069 19.7775 7.9685C20.1441 8.449 20.25 8.75886 20.25 9.04776H21.75C21.75 8.29902 21.4384 7.67256 20.97 7.05863C20.5148 6.46201 19.8453 5.79476 19.0253 4.97473L17.9646 6.03539ZM19.0253 4.97473C18.2052 4.1547 17.538 3.48521 16.9414 3.03C16.3274 2.56159 15.701 2.25 14.9522 2.25V3.75C15.2411 3.75 15.551 3.85592 16.0315 4.22253C16.5293 4.60235 17.1146 5.18538 17.9646 6.03539L19.0253 4.97473ZM11.9399 6.03539C12.7899 5.18538 13.3752 4.60235 13.873 4.22253C14.3535 3.85592 14.6633 3.75 14.9522 3.75V2.25C14.2035 2.25 13.577 2.56159 12.9631 3.03C12.3665 3.48521 11.6993 4.1547 10.8792 4.97473L11.9399 6.03539ZM14.3017 16.7837L7.21629 9.69832L6.15563 10.759L13.241 17.8444L14.3017 16.7837ZM15.0124 15.0124L12.0601 17.9646L13.1208 19.0253L16.073 16.073L15.0124 15.0124ZM19.5324 12.6124C20.1932 11.9464 20.7384 11.3759 21.114 10.8404C21.5023 10.2869 21.75 9.71511 21.75 9.04776H20.25C20.25 9.30755 20.1644 9.58207 19.886 9.979C19.5949 10.394 19.1401 10.8781 18.4676 11.5559L19.5324 12.6124Z" fill="#1C274C"/>
                <path d="M9 21H21" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-1 border-b sm:border-b-0 sm:border-r pb-1 sm:pb-0 sm:pr-2 mb-1 sm:mb-0 sm:mr-1 border-gray-500">
            {['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'].map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-6 h-6 rounded-full border-2 ${currentColor === color ? 'border-indigo-500' : 'border-transparent'} hover:border-indigo-400`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2 pb-1 sm:pb-0 sm:border-r sm:pr-2 mb-1 sm:mb-0 sm:mr-1 border-gray-500">
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={lineWidth}
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-20 cursor-pointer"
              title={`Line width: ${lineWidth}`}
            />
            <span className="text-xs w-4 text-center">{lineWidth}</span>
          </div>
          <div className="flex justify-center w-full sm:w-auto">
            <button 
              onClick={clearCanvasHandler}
              className="p-2 rounded-lg hover:bg-red-500/30 text-red-500"
              title="Clear Canvas"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas; 