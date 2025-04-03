import React, { useState, useEffect } from 'react';

interface GameSettingsData {
  maxRounds: number;
  timePerRound: number;
  customWords: string[];
  useOnlyCustomWords?: boolean;
}

interface GameSettingsProps {
  settings: GameSettingsData;
  onUpdate: (settings: GameSettingsData) => void;
  darkMode: boolean;
}

const GameSettings: React.FC<GameSettingsProps> = ({ settings, onUpdate, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState<GameSettingsData>({
    ...settings,
    useOnlyCustomWords: settings.useOnlyCustomWords ?? false
  });
  const [customWordsText, setCustomWordsText] = useState(
    Array.isArray(settings.customWords) ? settings.customWords.join('\n') : ''
  );

  useEffect(() => {
    if (!isOpen) {
      setLocalSettings({...settings, useOnlyCustomWords: settings.useOnlyCustomWords ?? false });
      setCustomWordsText(Array.isArray(settings.customWords) ? settings.customWords.join('\n') : '');
    }
  }, [settings, isOpen]);

  const MAX_ROUNDS = 20;
  const MIN_ROUNDS = 1;
  const MAX_TIME = 180; // 3 minutes
  const MIN_TIME = 30; // 30 seconds

  const handleSave = () => {
    const customWords = customWordsText
      .split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);
    
    const validatedSettings: GameSettingsData = {
      ...localSettings,
      maxRounds: Math.min(MAX_ROUNDS, Math.max(MIN_ROUNDS, localSettings.maxRounds)),
      timePerRound: Math.min(MAX_TIME, Math.max(MIN_TIME, localSettings.timePerRound)),
      customWords
    };
    
    onUpdate(validatedSettings);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setLocalSettings({...settings, useOnlyCustomWords: settings.useOnlyCustomWords ?? false });
    setCustomWordsText(Array.isArray(settings.customWords) ? settings.customWords.join('\n') : '');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full py-3 px-4 rounded-lg transition-all ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} text-white dark:text-gray-200 relative overflow-hidden group flex items-center justify-center`}
        title="Open Game Settings"
      >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
         </svg>
         Game Settings
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-md rounded-xl shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
        <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className="text-xl font-bold">Game Settings</h3>
          <p className="text-sm text-gray-400 mt-1">Customize your game experience</p>
        </div>
        
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
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
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="useOnlyCustomWords"
                checked={localSettings.useOnlyCustomWords}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  useOnlyCustomWords: e.target.checked
                }))}
                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="useOnlyCustomWords" className="text-sm">
                Use only custom words
              </label>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {localSettings.useOnlyCustomWords
                ? "Only custom words will be used in the game."
                : "Custom words will be added to the default word list."}
            </p>
          </div>
        </div>
        
        <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end space-x-3`}>
          <button
            onClick={handleCancel}
            className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} transition-colors ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
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