import React, { useState, useEffect } from 'react';
import { KeyBindings, GameSettings, ScreenState } from './types';
import StartScreen from './components/StartScreen';
import OptionsModal from './components/OptionsModal';
import GameStage from './components/GameStage';
import { audio } from './utils/audio';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('START');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  // Load configuration from localStorage to make it persist!
  const [bindings, setBindings] = useState<KeyBindings>(() => {
    const saved = localStorage.getItem('arcade_key_bindings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default
      }
    }
    return {
      moveLeft: 'a',
      moveRight: 'd',
      jump: ' ',
      attack: 'j',
      special: 'k',
    };
  });

  const [settings, setSettings] = useState<GameSettings>(() => {
    const saved = localStorage.getItem('arcade_game_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        audio.setVolume(parsed.soundVolume ?? 0.5);
        return parsed;
      } catch (e) {
        // use default
      }
    }
    return {
      soundVolume: 0.5,
      enableVibration: true,
      difficulty: 'NORMAL',
    };
  });

  // Save bindings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('arcade_key_bindings', JSON.stringify(bindings));
  }, [bindings]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('arcade_game_settings', JSON.stringify(settings));
    audio.setVolume(settings.soundVolume);
  }, [settings]);

  return (
    <div 
      id="main-viewport-frame" 
      className="fixed inset-0 w-screen h-screen bg-black overflow-hidden select-none p-2 md:p-4 flex items-center justify-center"
    >
      {/* Outer viewport boundary - requested black background with a strong red border */}
      <div 
        id="arcade-crimson-monitor" 
        className="w-full h-full bg-black border-[12px] border-red-700 rounded-none shadow-[inset_0_0_25px_rgba(220,38,38,0.4),0_0_30px_rgba(220,38,38,0.3)] relative overflow-hidden flex flex-col"
      >
        {/* Main Content Router */}
        {screen === 'START' && (
          <StartScreen 
            onStartGame={() => setScreen('GAME')}
            onOpenOptions={() => setIsOptionsOpen(true)}
            bindings={bindings}
          />
        )}

        {screen === 'GAME' && (
          <GameStage 
            bindings={bindings}
            settings={settings}
            onBackToMenu={() => setScreen('START')}
            onOpenOptions={() => setIsOptionsOpen(true)}
          />
        )}

        {/* Options Modal overlay */}
        <OptionsModal 
          isOpen={isOptionsOpen}
          onClose={() => setIsOptionsOpen(false)}
          bindings={bindings}
          onChangeBindings={setBindings}
          settings={settings}
          onChangeSettings={setSettings}
        />
      </div>
    </div>
  );
}
