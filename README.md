# DrawTogether - A Collaborative Drawing Game

DrawTogether is a real-time multiplayer drawing and guessing game where one player draws a word while others try to guess it.

## Features

- Real-time drawing with WebSockets
- Multiple drawing tools (brush, eraser, colors, sizes)
- Player readiness system
- Turn-based gameplay with customizable timer
- Speed-based scoring - faster guesses earn more points
- Private guessing with immediate feedback
- Chat functionality
- Global leaderboard tracking player performance
- Customizable game settings:
  - Number of rounds
  - Time per round
  - Custom word lists
- Fully responsive design for mobile and desktop
- Score tracking and end-game leaderboard

## How to Play

1. Join a room by entering a room ID or letting the app create one for you
2. Enter your name to join the game
3. Customize game settings if desired (rounds, time, custom words)
4. Press "Ready" when you're prepared to play
5. When all players are ready, the game will start
6. If you're the drawer, you'll receive a word to draw
7. If you're guessing, try to guess what the drawer is drawing
8. Points are awarded for correct guesses (faster guesses earn more points)
9. After all rounds, you'll see the game leaderboard and global top players

## Getting Started

### Prerequisites

- Node.js 14 or later
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/drawtogether.git
cd drawtogether

# Install dependencies
npm install
```

### Running the App

The app requires two servers:
1. The main Remix application server
2. The WebSocket server for real-time communication

You can start both with the provided batch file (Windows):

```bash
# Start both servers
start-servers.bat
```

Or start them individually:

```bash
# Start the WebSocket server
npm run websocket

# In another terminal, start the Remix development server
npm run dev
```

Then open http://localhost:3000 in your browser.

## Tech Stack

- [Remix](https://remix.run/) - Full-stack web framework
- [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) - Real-time communication
- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## Game Rules

- Each round, one player is selected to draw
- The drawer has a limited time to draw the assigned word (default: 60 seconds)
- Other players try to guess the word
- Points are awarded based on:
  - Correct guesses: 10 points + speed bonus (up to 20 points for very fast guesses)
  - Drawing that others can guess: 5 points per correct guess
- After all rounds, scores are tallied and a winner is declared
- Players can see their position on the global leaderboard
- Players can then ready up for a new game with the same or different settings

## Mobile Support

DrawTogether is fully responsive and works well on mobile devices:
- Touch-friendly canvas for drawing
- Collapsible player list for smaller screens
- Optimized UI elements for touch interaction
- Compact tools panel for mobile screens
