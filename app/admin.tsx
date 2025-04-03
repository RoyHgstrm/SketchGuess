function getActiveRoomsList() {
  const activeRooms = [];
  rooms.forEach((room, roomId) => {
    // Only include rooms with active players
    const activePlayers = room.players.filter(p => !p.disconnected);
    if (activePlayers.length > 0) {
      activeRooms.push({
        roomId,
        playerCount: activePlayers.length,
        isActive: room.gameState.status === 'playing',
        currentRound: room.gameState.currentRound,
        maxRounds: room.gameState.maxRounds,
        timeLeft: room.gameState.timeLeft,
        players: activePlayers.map(p => ({
          name: p.name,
          score: p.score,
          isReady: p.isReady,
          isDrawing: p.isDrawing,
          correctGuess: p.hasGuessedCorrectly
        })),
        currentWord: room.gameState.status === 'playing' ? (room.gameState.word || '(hidden)') : null,
        settings: {
          maxRounds: room.settings.maxRounds,
          timePerRound: room.settings.timePerRound,
          customWords: room.settings.customWords || null,
          useOnlyCustomWords: room.settings.useOnlyCustomWords || false
        }
      });
    }
  });
  
  return activeRooms;
} 