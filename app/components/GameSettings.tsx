import React, { useState } from 'react';

interface GameSettings {
  maxRounds: number;
  timePerRound: number;
  customWords: string[];
}

interface GameSettingsProps {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
  darkMode: boolean;
}

const GameSettings: React.FC<GameSettingsProps> = ({ settings, onUpdate, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [customWordsText, setCustomWordsText] = useState(settings.customWords.join('\n'));

  // Apply limits to settings
  const MAX_ROUNDS = 20;
  const MIN_ROUNDS = 1;
  const MAX_TIME = 180; // 3 minutes
  const MIN_TIME = 30; // 30 seconds

  const handleSave = () => {
    // Clean and validate custom words
    const customWords = customWordsText
      .split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);
    
    // Apply limits to settings
    const validatedSettings = {
      ...localSettings,
      maxRounds: Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, localSettings.maxRounds)),
      timePerRound: Math.min(MAX_TIME, Math.max(MIN_TIME, localSettings.timePerRound)),
      customWords
    };
    
    // Update settings
    onUpdate(validatedSettings);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full py-2 px-4 rounded-lg transition-colors ${
          darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'
        } text-white font-medium`}
      >
        <div className="flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Game Settings
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-xl shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="text-xl font-bold">Game Settings</h3>
          <p className="text-sm text-gray-400 mt-1">Customize your game experience</p>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Number of Rounds</label>
            <div className="flex items-center">
              <input
                type="range"
                min={MIN_ROUNDS}
                max={MAX_ROUNDS}
                value={localSettings.maxRounds}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  maxRounds: parseInt(e.target.value)
                }))}
                className="flex-1 mr-3"
              />
              <div className={`px-3 py-1 rounded-lg text-center w-16 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {localSettings.maxRounds}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Time per Round (seconds)</label>
            <div className="flex items-center">
              <input
                type="range"
                min={MIN_TIME}
                max={MAX_TIME}
                step="10"
                value={localSettings.timePerRound}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  timePerRound: parseInt(e.target.value)
                }))}
                className="flex-1 mr-3"
              />
              <div className={`px-3 py-1 rounded-lg text-center w-16 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {localSettings.timePerRound}s
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Custom Words (one per line)</label>
            <textarea
              value={customWordsText}
              onChange={(e) => setCustomWordsText(e.target.value)}
              placeholder="Enter your custom words here..."
              rows={5}
              className={`w-full px-3 py-2 rounded-lg ${
                darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            />
            <p className="text-xs text-gray-400 mt-1">
              These will be added to the default word list. Enter each word on a new line.
            </p>
          </div>
        </div>
        
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end space-x-3`}>
          <button
            onClick={() => setIsOpen(false)}
            className={`px-4 py-2 rounded-lg ${
              darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            } transition-colors`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSettings; 