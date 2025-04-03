# SketchGuess - A Real-time Multiplayer Drawing and Guessing Game

SketchGuess is an online multiplayer game where players take turns drawing words while others try to guess them correctly. Built with modern web technologies, it provides a fun and interactive experience.
![image](https://github.com/user-attachments/assets/ab9b3d61-7c16-4b6f-bd92-9eb59558ce50)

## Features

- **Real-time Drawing**: Collaborative canvas with WebSockets for instant updates
- **Multiple Drawing Tools**: Brush, eraser, colors, sizes
- **Turn-based Gameplay**: Players take turns drawing randomly selected words
- **Custom Game Settings**: Customize rounds, time per round, and word lists
- **Chat System**: Integrated chat for guessing and communication
- **Scoring System**: Faster guesses earn more points
- **Responsive Design**: Works on mobile and desktop devices

## Technical Improvements

Recent fixes and improvements:

- ✅ Fixed room creation with consistent property naming
- ✅ Enhanced WebSocket connection stability
- ✅ Improved canvas clear functionality between rounds
- ✅ Fixed game initialization and start process
- ✅ Added better error handling and user feedback

## Getting Started

### Prerequisites

- Node.js 14.0 or higher
- npm or yarn

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/RoyHgstrm/sketchguess.git
   cd sketchguess
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development servers:
   
   For Windows:
   ```
   start-servers.bat
   ```
   
   For Mac/Linux:
   ```
   # Terminal 1
   npm run websocket
   
   # Terminal 2
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Play

1. Create a new room or join an existing one with a room code
2. Share the room code with friends
3. Wait for everyone to join and click "Ready"
4. Follow the prompts to draw when it's your turn
5. Guess what others are drawing when it's not your turn
6. Earn points for correct guesses and successful drawings
7. Highest score at the end wins!

## Technologies Used

- React & Remix
- WebSockets for real-time communication
- TypeScript for type safety
- Tailwind CSS for styling

## License

MIT

## Acknowledgments

- Inspired by popular drawing games like Pictionary and skribbl.io
