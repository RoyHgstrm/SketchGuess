import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '~/context/WebSocketContext';

interface DrawingCanvasProps {
  darkMode: boolean;
}

// Define interfaces locally
interface DrawingData {
  type: 'draw' | 'clear';
  x?: number;
  y?: number;
  prevX?: number;
  prevY?: number;
  color?: string;
  lineWidth?: number;
  isNewLine?: boolean;
  drawerId?: string;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ darkMode }) => {
  const { handleDraw, currentPlayer, gameState, isConnected } = useWebSocket();
  
  // Canvas refs and state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const lastClearTimestampRef = useRef<number | null>(null);
  
  // Store drawing history for redrawing when resizing
  interface DrawingAction {
    type: 'draw' | 'clear';
    x?: number;
    y?: number;
    prevX?: number;
    prevY?: number;
    color?: string;
    lineWidth?: number;
    isNewLine?: boolean;
    drawerId?: string;
  }
  
  const drawingHistoryRef = useRef<DrawingAction[]>([]);

  // Determine if current player can draw
  const canDraw = gameState?.isDrawing || false;
  
  // Debug game state to help troubleshoot UI issues
  useEffect(() => {
    console.log('Game State Updated:', gameState);
    console.log('Current player:', currentPlayer);
    console.log('Can Draw:', canDraw);
  }, [gameState, currentPlayer, canDraw]);

  // Color palette options
  const colors = [
    "#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", 
    "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500", "#800080"
  ];

  // Brush size options
  const brushSizes = [2, 5, 10, 15, 20];

  // Clear canvas completely
  const clearCanvas = useCallback((context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, color: string = '#FFFFFF') => {
    if (!context || !canvas) return;
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Update canvas dimensions while maintaining the drawing
  const updateCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;
    
    // Store the existing drawing to restore after resize
    const existingContext = contextRef.current;
    let imageData = null;
    if (existingContext) {
      try {
        imageData = existingContext.getImageData(0, 0, canvas.width/2, canvas.height/2);
      } catch (e) {
        console.error('Could not save canvas state:', e);
      }
    }
    
    // Get container dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspectRatio = 16 / 9;
    
    // Calculate dimensions while maintaining aspect ratio
    let canvasWidth = containerWidth;
    let canvasHeight = containerWidth / aspectRatio;
    
    // If calculated height is too large, calculate from height instead
    if (canvasHeight > containerHeight) {
      canvasHeight = containerHeight;
      canvasWidth = containerHeight * aspectRatio;
    }
    
    // Set logical dimensions
    canvas.width = canvasWidth * 2;
    canvas.height = canvasHeight * 2;
    
    // Set display dimensions
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    
    // Store dimensions for calculations
    canvasSizeRef.current = { width: canvasWidth, height: canvasHeight };
    
    // Initialize context
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.scale(2, 2);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = currentColor;
    context.lineWidth = lineWidth;
    
    contextRef.current = context;
    
    // Set initial background to white only if no existing drawing
    if (!imageData) {
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      // Restore previous drawing
      try {
        context.putImageData(imageData, 0, 0);
      } catch (e) {
        console.error('Could not restore canvas state:', e);
        // Fallback to white background if restore fails
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    console.log(`Canvas resized to ${canvasWidth}x${canvasHeight}, devicePixelRatio: ${window.devicePixelRatio}`);
  }, [currentColor, lineWidth]);

  // Initialize canvas when component mounts or when drawing status changes
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;
    
    // Only initialize the canvas once when the game starts
    if (!contextRef.current) {
      console.log('Initializing canvas for the first time');
      updateCanvasDimensions();
    }
    
    // Set up resize observer to handle container size changes
    if (containerRef.current && !resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        updateCanvasDimensions();
      });
      
      resizeObserverRef.current.observe(containerRef.current);
    }
    
    // Clean up resize observer
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [gameState, updateCanvasDimensions]);

  // Handle receiving drawing data from WebSocket
  useEffect(() => {
    const handleDrawingData = (event: CustomEvent) => {
      try {
        const data = event.detail;
        
        // Add more descriptive logging to help debug issues
        if (data.type === 'draw') {
          console.log('Received drawing data:', {
            type: data.type,
            drawerId: data.drawerId,
            timestamp: data.timestamp,
            isNewLine: data.isNewLine,
            coords: `(${data.x},${data.y})`,
            prevCoords: data.prevX ? `(${data.prevX},${data.prevY})` : 'none'
          });
        } else {
          console.log('Received drawing data:', data);
        }
        
        // Clear canvas message - add timestamp check to prevent frequent clears
        if (data.type === 'clear') {
          console.log('Received clear canvas command');
          
          // Skip redundant clear commands (within short timeframes)
          if (data.timestamp) {
            const now = Date.now();
            // Skip if we received another clear command in the last 5 seconds
            if (lastClearTimestampRef.current && (now - lastClearTimestampRef.current < 5000)) {
              console.log('Ignoring redundant clear command (too frequent)');
              return;
            }
            lastClearTimestampRef.current = now;
          }
          
          drawingHistoryRef.current = []; // Clear drawing history
          
          const canvas = canvasRef.current;
          const context = contextRef.current;
          
          if (canvas && context) {
            clearCanvas(context, canvas, data.color || '#FFFFFF');
          }
          
          return; // Don't process further after clearing
        }
        
        // Handle drawing data
        if (data.type === 'draw') {
          // If we're the drawer and this is our own drawing data, ignore it
          // We've already drawn it locally
          if (currentPlayer && data.drawerId === currentPlayer.id && canDraw) {
            console.log('Ignoring our own drawing data');
            return;
          }
          
          // Skip old drawing commands (more than 30 seconds old)
          if (data.timestamp) {
            const now = Date.now();
            if (now - data.timestamp > 30000) {
              console.log('Ignoring old drawing data');
              return;
            }
          }
          
          // Add to drawing history
          const drawAction: DrawingAction = {
            type: 'draw',
            x: data.x,
            y: data.y,
            prevX: data.prevX,
            prevY: data.prevY,
            color: data.color,
            lineWidth: data.lineWidth,
            isNewLine: data.isNewLine,
            drawerId: data.drawerId
          };
          
          drawingHistoryRef.current.push(drawAction);
          
          const context = contextRef.current;
          if (!context) return;
          
          // Set stroke properties
          context.strokeStyle = data.color || '#000000';
          context.lineWidth = data.lineWidth || 5;
          
          // Draw the line
          if (data.isNewLine) {
            context.beginPath();
            context.moveTo(data.x, data.y);
          } else {
            context.beginPath();
            context.moveTo(data.prevX || data.x, data.prevY || data.y);
            context.lineTo(data.x, data.y);
            context.stroke();
            context.closePath();
          }
        }
      } catch (error) {
        console.error('Error processing drawing data:', error);
      }
    };
    
    // Add event listener for drawing data
    window.addEventListener('drawing-data', handleDrawingData as EventListener);
    
    return () => {
      window.removeEventListener('drawing-data', handleDrawingData as EventListener);
    };
  }, [canDraw, clearCanvas, currentPlayer]);

  // Update tools without resizing canvas
  useEffect(() => {
    if (contextRef.current) {
      // Only update the properties without clearing the canvas
      contextRef.current.strokeStyle = tool === 'eraser' ? '#FFFFFF' : currentColor;
      contextRef.current.lineWidth = lineWidth;
    }
  }, [currentColor, lineWidth, tool]);

  // Listen for window resize events for responsive behavior
  useEffect(() => {
    const handleWindowResize = () => {
      updateCanvasDimensions();
    };
    
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [updateCanvasDimensions]);

  // Start drawing function
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    setIsDrawingLine(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    if (tool === 'fill') {
      // Implement flood fill
      contextRef.current.fillStyle = currentColor;
      contextRef.current.fillRect(0, 0, canvas.width, canvas.height);
      
      // Send fill command to server
      const fillData: DrawingData = {
        type: 'clear',
        color: currentColor
      };
      
      // Add to drawing history
      drawingHistoryRef.current.push(fillData);
      
      // Send to server
      handleDraw(fillData);
    } else {
      contextRef.current.beginPath();
      contextRef.current.moveTo(x, y);
      setLastPoint({ x, y });

      if (tool === 'eraser') {
        contextRef.current.strokeStyle = '#FFFFFF';
      } else {
        contextRef.current.strokeStyle = currentColor;
      }

      // Create drawing data
      const drawData: DrawingData = {
        type: 'draw',
        x,
        y,
        prevX: x,
        prevY: y,
        color: tool === 'eraser' ? '#FFFFFF' : currentColor,
        lineWidth,
        isNewLine: true,
        drawerId: currentPlayer?.id
      };
      
      // Add to drawing history
      drawingHistoryRef.current.push(drawData);
      
      // Send start drawing command to server with drawer ID
      handleDraw(drawData);
    }
  }, [canDraw, currentColor, lineWidth, tool, handleDraw, currentPlayer]);

  // Draw function
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingLine || !canDraw || tool === 'fill') return;

    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current || !lastPoint) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    // Prevent multiple points at the same position (can happen with fast movements)
    if (Math.abs(x - lastPoint.x) < 1 && Math.abs(y - lastPoint.y) < 1) {
      return;
    }

    // Draw a line from the last point to the current point
    contextRef.current.beginPath();
    contextRef.current.moveTo(lastPoint.x, lastPoint.y);
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
    contextRef.current.closePath();
    
    // Update the last point
    const prevPoint = { ...lastPoint };
    setLastPoint({ x, y });

    // Create drawing data for history
    const drawAction: DrawingAction = {
      type: 'draw',
      x,
      y,
      prevX: prevPoint.x,
      prevY: prevPoint.y,
      color: tool === 'eraser' ? '#FFFFFF' : currentColor,
      lineWidth,
      isNewLine: false,
      drawerId: currentPlayer?.id
    };
    
    // Add to drawing history
    drawingHistoryRef.current.push(drawAction);
    
    // Create drawing data for WebSocket
    const drawData: DrawingData = {
      type: 'draw',
      x,
      y,
      prevX: prevPoint.x,
      prevY: prevPoint.y,
      color: tool === 'eraser' ? '#FFFFFF' : currentColor,
      lineWidth,
      isNewLine: false,
      drawerId: currentPlayer?.id
    };
    
    // Send drawing update to server with drawer ID
    console.log('Sending drawing data to server:', drawData);
    handleDraw(drawData);
  }, [isDrawingLine, canDraw, tool, currentColor, lineWidth, lastPoint, handleDraw, currentPlayer]);

  // Stop drawing function
  const stopDrawing = useCallback(() => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawingLine(false);
    setLastPoint(null);
  }, []);

  // Clear canvas function
  const clearCanvasHandler = useCallback(() => {
    if (!canDraw) return;
    
    const canvas = canvasRef.current;
    const context = contextRef.current;
    
    if (!canvas || !context) return;
    
    // Clear the canvas
    clearCanvas(context, canvas);
    
    // Clear drawing history
    drawingHistoryRef.current = [];
    
    // Send clear canvas command to server
    handleDraw({ 
      type: 'clear',
      drawerId: currentPlayer?.id
    });
    
    console.log('Clearing canvas and sending clear command to server');
  }, [canDraw, handleDraw, currentPlayer, clearCanvas]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Game status bar */}
      {gameState?.status === 'playing' && (
        <div className={`mb-4 p-3 rounded-lg ${
          canDraw 
            ? 'bg-green-500/20 border border-green-500/30' 
            : 'bg-blue-500/20 border border-blue-500/30'
        }`}>
          {canDraw ? (
            <div className="flex items-center">
              <span className="font-medium text-green-400 mr-2">Your turn to draw:</span>
              <span className="bg-gray-700 px-3 py-1 rounded-lg font-bold">{gameState?.word}</span>
            </div>
          ) : (
            <div className="text-blue-400">
              {gameState?.drawer?.name} is drawing... Guess the word!
            </div>
          )}
        </div>
      )}

      {/* Drawing tools - only show if current player is the drawer */}
      {canDraw && gameState?.status === 'playing' && (
        <div className={`flex flex-wrap items-center gap-2 p-3 mb-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          {/* Tools */}
          <div className="flex gap-1">
            <button
              onClick={() => setTool('brush')}
              className={`p-2 rounded-lg transition-all ${
                tool === 'brush' 
                  ? 'bg-indigo-500 text-white shadow-lg scale-105' 
                  : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
              title="Brush"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg transition-all ${
                tool === 'eraser'
                  ? 'bg-indigo-500 text-white shadow-lg scale-105'
                  : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
              title="Eraser"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={() => setTool('fill')}
              className={`p-2 rounded-lg transition-all ${
                tool === 'fill'
                  ? 'bg-indigo-500 text-white shadow-lg scale-105'
                  : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
              title="Fill"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex gap-1 flex-wrap max-w-xs">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={`w-6 h-6 rounded-lg transition-all ${
                  currentColor === color ? 'scale-110 shadow-lg ring-2 ring-indigo-500' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <input
              type="color"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              className="w-6 h-6 rounded-lg cursor-pointer"
              title="Custom Color"
            />
          </div>

          {/* Brush Size */}
          <div className="flex gap-1">
            {brushSizes.map((size) => (
              <button
                key={size}
                onClick={() => setLineWidth(size)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                  lineWidth === size 
                    ? 'bg-indigo-500 text-white shadow-lg scale-105' 
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
                title={`${size}px`}
              >
                <div 
                  className="rounded-full bg-current"
                  style={{ width: size, height: size }}
                />
              </button>
            ))}
          </div>

          {/* Clear Canvas */}
          <button
            onClick={clearCanvasHandler}
            disabled={!canDraw}
            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className={`flex-1 relative rounded-lg overflow-hidden ${
          canDraw ? 'ring-2 ring-green-500 ring-opacity-50' : 'ring-1 ring-blue-500 ring-opacity-30'
        }`}
      >
        {/* Drawing Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`absolute inset-0 rounded-lg bg-white touch-none ${canDraw ? 'cursor-crosshair' : 'cursor-default'}`}
        />
        
        {/* Waiting state - show if game is not in progress */}
        {gameState?.status !== 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 z-10 text-white">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-bold mb-2">
                Waiting for game to start
              </h3>
              <p className="text-gray-300">
                Get ready to draw and guess!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingCanvas; 