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

## Techstack

- **Frontend**: React + Remix, TypeScript, TailwindCSS
- **Backend**: Node.js with Express
- **Real-time Communication**: WebSockets (ws library)
- **Deployment**: Docker support for easy deployment

## Recent Improvements

- ✅ Unified WebSocket and HTTP on a single port (3000)
- ✅ Fixed room creation and player joining issues
- ✅ Added external access capabilities
- ✅ Improved error handling and automatic reconnection
- ✅ Enhanced UI with responsive design for all devices
- ✅ Added Terms of Service page

## Getting Started

### Running with Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/RoyHgstrm/SketchGuess.git
   cd SketchGuess
   ```

2. **Build and run with Docker**:
   ```bash
   docker build -t sketchguess --no-cache .
   docker run -d --name sketchguess-app -p 3000:3000 sketchguess
   ```

3. **Access the game**:
   Open your browser and navigate to `http://localhost:3000`

### Running without Docker (Development)

1. **Prerequisites**:
   - Node.js (v18 or higher)
   - npm or yarn

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create an environment file**:
   Create a `.env` file in the project root with:
   ```
   PORT=3000
   NODE_ENV=development
   WS_PORT=3000
   HOST=0.0.0.0
   ```

4. **Start the development server**:
   ```bash
   npm run dev:all
   ```

5. **Access the game**:
   Open your browser and navigate to `http://localhost:3000`

## Enabling External Access

To allow players from outside your network to join your game:

1. **Port forwarding**: Configure your router to forward port 3000 to your computer
2. **Firewall settings**: Ensure your firewall allows inbound connections on port 3000
3. **Share your public IP**: Players can connect using `http://YOUR_PUBLIC_IP:3000`
4. **Domain (optional)**: Set up a domain name pointing to your public IP for easier access

## How to Play

1. **Create a Room**: Start a new game room and share the room code with friends
2. **Join a Room**: Enter an existing room code to join a friend's game
3. **Get Ready**: Click the "Ready" button when you're prepared to play
4. **Drawing Turn**: When it's your turn, draw the given word within the time limit
5. **Guessing**: Type your guesses in the chat when it's not your turn
6. **Scoring**: Earn points for correct guesses - faster guesses earn more points
7. **Winner**: The player with the highest score at the end wins!

## Development

### Project Structure

- `app/` - Frontend React/Remix application
- `server.js` - Combined HTTP and WebSocket server
- `websocket-server.js` - WebSocket game logic

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by pictionary-style drawing games
- Built with Remix and WebSockets
- Thanks to all contributors and players!
