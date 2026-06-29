import React, { useState, useEffect } from 'react';
import { KeyBindings, GameSettings } from '../types';
import { audio } from '../utils/audio';
import { X, Volume2, ShieldAlert, Zap, RotateCcw, Keyboard } from 'lucide-react';

interface OptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bindings: KeyBindings;
  onChangeBindings: (bindings: KeyBindings) => void;
  settings: GameSettings;
  onChangeSettings: (settings: GameSettings) => void;
}

export function getFriendlyKeyName(key: string): string {
  if (!key) return 'ยังไม่ได้ตั้งค่า';
  if (key === ' ') return 'Spacebar';
  if (key === 'ArrowLeft') return 'ลูกศรซ้าย (←)';
  if (key === 'ArrowRight') return 'ลูกศรขวา (→)';
  if (key === 'ArrowUp') return 'ลูกศรขึ้น (↑)';
  if (key === 'ArrowDown') return 'ลูกศรลง (↓)';
  if (key === 'Control') return 'Ctrl';
  if (key === 'Shift') return 'Shift';
  if (key === 'Alt') return 'Alt';
  if (key === 'Enter') return 'Enter';
  if (key === 'Escape') return 'Esc';
  return key.toUpperCase();
}

export default function OptionsModal({
  isOpen,
  onClose,
  bindings,
  onChangeBindings,
  settings,
  onChangeSettings,
}: OptionsModalProps) {
  const [listeningFor, setListeningFor] = useState<keyof KeyBindings | null>(null);

  useEffect(() => {
    if (!listeningFor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      audio.playClick();
      
      const newBindings = { ...bindings };
      // Prevent assigning Escape or other system disrupting keys directly if not desired,
      // but let's allow common keys. We will use e.key.
      newBindings[listeningFor] = e.key;
      onChangeBindings(newBindings);
      setListeningFor(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningFor, bindings, onChangeBindings]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    audio.playClick();
    onChangeBindings({
      moveLeft: 'a',
      moveRight: 'd',
      jump: ' ',
      attack: 'j',
      special: 'k',
    });
    onChangeSettings({
      soundVolume: 0.5,
      enableVibration: true,
      difficulty: 'NORMAL',
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    audio.setVolume(vol);
    onChangeSettings({ ...settings, soundVolume: vol });
  };

  const toggleVibration = () => {
    audio.playClick();
    onChangeSettings({ ...settings, enableVibration: !settings.enableVibration });
  };

  const setDifficulty = (diff: 'EASY' | 'NORMAL' | 'HARD') => {
    audio.playClick();
    onChangeSettings({ ...settings, difficulty: diff });
  };

  return (
    <div id="options-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      {/* Red glowing futuristic window box */}
      <div 
        id="options-modal-container" 
        className="w-full max-w-lg bg-black border-2 border-red-600 rounded-lg shadow-[0_0_25px_rgba(220,38,38,0.4)] overflow-hidden flex flex-col font-mono"
      >
        {/* Header */}
        <div id="options-header" className="flex items-center justify-between border-b border-red-800/60 bg-red-950/20 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <h2 className="text-red-500 text-lg font-bold uppercase tracking-wider">
              ตั้งค่าการบังคับ & ตัวเลือกเกม
            </h2>
          </div>
          <button 
            id="close-options-btn"
            onClick={() => { audio.playClick(); onClose(); }}
            className="text-red-500/80 hover:text-red-400 p-1 hover:bg-red-950/40 rounded transition"
            aria-label="ปิดเมนูตั้งค่า"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div id="options-body" className="p-6 space-y-6 overflow-y-auto max-h-[75vh] scrollbar-thin scrollbar-thumb-red-600 scrollbar-track-black text-gray-300">
          
          {/* Section 1: Keyboard Mapping */}
          <div id="controls-section" className="space-y-3">
            <div className="flex items-center gap-2 border-b border-red-900/30 pb-2 mb-3">
              <Keyboard className="text-red-500" size={18} />
              <h3 className="text-red-400 font-bold text-sm tracking-wide uppercase">
                ตั้งค่าปุ่มตัวละคร (Keyboard Bindings)
              </h3>
            </div>

            <div className="space-y-2 text-sm">
              {/* Move Left */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded border border-red-950/20 hover:border-red-600/30 transition">
                <span className="text-zinc-400">เคลื่อนที่ซ้าย (Move Left)</span>
                <button
                  id="bind-left-btn"
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => { audio.playClick(); setListeningFor('moveLeft'); }}
                  className={`px-4 py-1.5 rounded font-bold text-xs uppercase transition border min-w-[140px] text-center ${
                    listeningFor === 'moveLeft'
                      ? 'bg-red-600 border-red-500 text-white animate-pulse'
                      : 'bg-black border-red-900 text-red-400 hover:bg-red-950/30 hover:border-red-500'
                  }`}
                >
                  {listeningFor === 'moveLeft' ? 'กดปุ่มเพื่อตั้ง...' : getFriendlyKeyName(bindings.moveLeft)}
                </button>
              </div>

              {/* Move Right */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded border border-red-950/20 hover:border-red-600/30 transition">
                <span className="text-zinc-400">เคลื่อนที่ขวา (Move Right)</span>
                <button
                  id="bind-right-btn"
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => { audio.playClick(); setListeningFor('moveRight'); }}
                  className={`px-4 py-1.5 rounded font-bold text-xs uppercase transition border min-w-[140px] text-center ${
                    listeningFor === 'moveRight'
                      ? 'bg-red-600 border-red-500 text-white animate-pulse'
                      : 'bg-black border-red-900 text-red-400 hover:bg-red-950/30 hover:border-red-500'
                  }`}
                >
                  {listeningFor === 'moveRight' ? 'กดปุ่มเพื่อตั้ง...' : getFriendlyKeyName(bindings.moveRight)}
                </button>
              </div>

              {/* Jump */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded border border-red-950/20 hover:border-red-600/30 transition">
                <span className="text-zinc-400">กระโดด (Jump)</span>
                <button
                  id="bind-jump-btn"
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => { audio.playClick(); setListeningFor('jump'); }}
                  className={`px-4 py-1.5 rounded font-bold text-xs uppercase transition border min-w-[140px] text-center ${
                    listeningFor === 'jump'
                      ? 'bg-red-600 border-red-500 text-white animate-pulse'
                      : 'bg-black border-red-900 text-red-400 hover:bg-red-950/30 hover:border-red-500'
                  }`}
                >
                  {listeningFor === 'jump' ? 'กดปุ่มเพื่อตั้ง...' : getFriendlyKeyName(bindings.jump)}
                </button>
              </div>

              {/* Attack */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded border border-red-950/20 hover:border-red-600/30 transition">
                <span className="text-zinc-400">โจมตีเบสิก (Attack)</span>
                <button
                  id="bind-attack-btn"
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => { audio.playClick(); setListeningFor('attack'); }}
                  className={`px-4 py-1.5 rounded font-bold text-xs uppercase transition border min-w-[140px] text-center ${
                    listeningFor === 'attack'
                      ? 'bg-red-600 border-red-500 text-white animate-pulse'
                      : 'bg-black border-red-900 text-red-400 hover:bg-red-950/30 hover:border-red-500'
                  }`}
                >
                  {listeningFor === 'attack' ? 'กดปุ่มเพื่อตั้ง...' : getFriendlyKeyName(bindings.attack)}
                </button>
              </div>

              {/* Special Skill */}
              <div className="flex items-center justify-between bg-zinc-900/50 p-2.5 rounded border border-red-950/20 hover:border-red-600/30 transition">
                <span className="text-zinc-400">สกิลพิเศษ (Special Skill)</span>
                <button
                  id="bind-special-btn"
                  onMouseEnter={() => audio.playHover()}
                  onClick={() => { audio.playClick(); setListeningFor('special'); }}
                  className={`px-4 py-1.5 rounded font-bold text-xs uppercase transition border min-w-[140px] text-center ${
                    listeningFor === 'special'
                      ? 'bg-red-600 border-red-500 text-white animate-pulse'
                      : 'bg-black border-red-900 text-red-400 hover:bg-red-950/30 hover:border-red-500'
                  }`}
                >
                  {listeningFor === 'special' ? 'กดปุ่มเพื่อตั้ง...' : getFriendlyKeyName(bindings.special)}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Sound & Screen Shake Settings */}
          <div id="general-settings-section" className="space-y-4 pt-2">
            
            {/* Audio Settings */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-red-900/30 pb-2 mb-2">
                <Volume2 className="text-red-500" size={18} />
                <h3 className="text-red-400 font-bold text-sm tracking-wide uppercase">
                  ระดับเสียง (Audio Options)
                </h3>
              </div>
              <div className="flex items-center gap-4 bg-zinc-900/30 p-2.5 rounded border border-red-950/10">
                <span className="text-zinc-400 text-sm min-w-[50px]">{Math.round(settings.soundVolume * 100)}%</span>
                <input
                  id="volume-range-input"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.soundVolume}
                  onChange={handleVolumeChange}
                  className="w-full accent-red-600 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Other Interactive Options */}
            <div className="grid grid-cols-2 gap-3 text-sm pt-2">
              <div className="bg-zinc-900/50 p-3 rounded border border-red-950/20 flex flex-col justify-between">
                <span className="text-zinc-400 block mb-2 text-xs">เอฟเฟกต์หน้าจอสั่น (Screen Shake)</span>
                <button
                  id="toggle-shake-btn"
                  onMouseEnter={() => audio.playHover()}
                  onClick={toggleVibration}
                  className={`w-full py-1.5 rounded font-bold text-xs uppercase border transition ${
                    settings.enableVibration 
                      ? 'bg-red-950/40 border-red-500 text-red-400' 
                      : 'bg-black border-zinc-800 text-zinc-500'
                  }`}
                >
                  {settings.enableVibration ? 'เปิด (ON)' : 'ปิด (OFF)'}
                </button>
              </div>

              <div className="bg-zinc-900/50 p-3 rounded border border-red-950/20 flex flex-col justify-between">
                <span className="text-zinc-400 block mb-2 text-xs">ความยากของเกม (Difficulty)</span>
                <div className="grid grid-cols-3 gap-1">
                  {(['EASY', 'NORMAL', 'HARD'] as const).map((diff) => (
                    <button
                      key={diff}
                      id={`diff-${diff.toLowerCase()}-btn`}
                      onMouseEnter={() => audio.playHover()}
                      onClick={() => setDifficulty(diff)}
                      className={`py-1 rounded font-bold text-[10px] transition border ${
                        settings.difficulty === diff
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-black border-zinc-800 text-zinc-400 hover:border-red-900'
                      }`}
                    >
                      {diff === 'EASY' ? 'ง่าย' : diff === 'NORMAL' ? 'กลาง' : 'ยาก'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Quick Info Tip */}
          <div id="quick-tip-card" className="flex items-start gap-2.5 bg-red-950/10 border border-red-900/20 p-3 rounded text-xs text-red-400/90 leading-relaxed">
            <ShieldAlert className="shrink-0 text-red-500 mt-0.5" size={16} />
            <p>
              ปุ่มบังคับเหล่านี้จะถูกนำไปใช้ในเวทีทดสอบ (Action Test Stage) ของตัวละครโดยอัตโนมัติ คุณสามารถเข้าเล่นเพื่อทดสอบปุ่มหลังจากตั้งค่าเสร็จแล้ว!
            </p>
          </div>

        </div>

        {/* Footer actions */}
        <div id="options-footer" className="border-t border-red-800/60 bg-zinc-950 px-5 py-4 flex items-center justify-between gap-3">
          <button
            id="reset-defaults-btn"
            onMouseEnter={() => audio.playHover()}
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs rounded font-bold transition"
          >
            <RotateCcw size={14} />
            คืนค่าเริ่มต้น
          </button>

          <button
            id="save-options-btn"
            onMouseEnter={() => audio.playHover()}
            onClick={() => { audio.playClick(); onClose(); }}
            className="flex items-center justify-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs rounded font-bold transition shadow-[0_0_10px_rgba(220,38,38,0.3)] border border-red-500"
          >
            <Zap size={14} />
            บันทึก & ตกลง
          </button>
        </div>
      </div>
    </div>
  );
}
