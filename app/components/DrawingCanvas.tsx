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

  const canDraw = gameState?.drawer?.name === currentPlayer?.name && gameState?.status === 'playing';

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
              <span className="bg-gray-800 text-white px-3 py-1 rounded-lg font-bold">{gameState?.word || '...'}</span>
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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M17.117 2.82a1.5 1.5 0 012.106 2.166l-7.5 8.1a1.5 1.5 0 01-1.007.474H6.75a.75.75 0 01-.75-.75V9.148a1.5 1.5 0 01.326-.956l7.79-8.372zM16 4.06a.5.5 0 00-.707 0L9.207 10.146a.5.5 0 00-.109.319V13.25a.25.25 0 00.25.25h2.783a.5.5 0 00.354-.146l6.415-6.85a.5.5 0 000-.732L16.707 4.06a.5.5 0 00-.707 0zM3.25 5.5a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm0 4a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75z" clipRule="evenodd" />
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