import React, { useState } from 'react';
import { motion } from 'motion/react';
import { audio } from '../utils/audio';
import { Play, Settings, Shield, Keyboard, Sparkles } from 'lucide-react';
import { getFriendlyKeyName } from './OptionsModal';
import { KeyBindings } from '../types';

interface StartScreenProps {
  onStartGame: () => void;
  onOpenOptions: () => void;
  bindings: KeyBindings;
}

export default function StartScreen({ onStartGame, onOpenOptions, bindings }: StartScreenProps) {
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);

  const menuItems = [
    {
      id: 0,
      label: 'เข้าเล่นเกม (START GAME)',
      description: 'เข้าสู่เวทีประลองเพื่อทดสอบปุ่มกดและสะสมคะแนน',
      icon: <Play className="text-red-500 group-hover:animate-pulse" size={18} />,
      onClick: () => {
        audio.playStartGame();
        onStartGame();
      }
    },
    {
      id: 1,
      label: 'ตั้งค่าปุ่มควบคุม (OPTIONS)',
      description: 'ปรับแต่งปุ่มบังคับตัวละคร ความดังเสียง และโหมดท้าทาย',
      icon: <Settings className="text-red-500 group-hover:rotate-45 transition duration-500" size={18} />,
      onClick: () => {
        audio.playClick();
        onOpenOptions();
      }
    }
  ];

  return (
    <div 
      id="start-screen-wrapper" 
      className="relative w-full h-full flex flex-col items-center justify-between bg-black text-white p-6 md:p-12 font-mono select-none overflow-hidden"
    >
      {/* Immersive UI ambient glows and radial gradients */}
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(220,38,38,0.15)_0%,_transparent_70%)]"></div>
      </div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-red-900/5 rounded-full blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute top-0 left-0 w-64 h-64 bg-red-900/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Retro Digital Scanlines and Ambient Grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.005),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] pointer-events-none z-10" />

      {/* Header banner decoration */}
      <div className="w-full text-center py-2 z-20 border-b border-red-950/20 bg-black/40 flex justify-between px-6 text-zinc-500 text-[10px]">
        <span>ARCADE UNIT [ONLINE]</span>
        <span className="animate-pulse text-red-500 font-bold">● LIVE CONSOLE</span>
        <span>VERSION 1.0.4-BETA</span>
      </div>

      {/* Main Center content containing Logo and Menus */}
      <div className="flex-1 w-full flex flex-col items-center justify-center gap-8 max-w-4xl z-20 my-4">
        
        {/* LOGO - Requested to be 60% large width */}
        <motion.div 
          id="logo-container"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="w-[60%] flex flex-col items-center justify-center relative group"
        >
          {/* Crimson glow ring behind logo */}
          <div className="absolute inset-0 rounded-full bg-red-600/10 blur-3xl group-hover:bg-red-600/20 transition-all duration-1000" />
          
          <img 
            id="start-logo"
            src="https://res.cloudinary.com/djxaquqkq/image/upload/v1782715768/logo_i8827v_qo57nz.png" 
            alt="Game Logo" 
            referrerPolicy="no-referrer"
            className="w-full h-auto object-contain drop-shadow-[0_0_35px_rgba(220,38,38,0.5)] hover:scale-102 transition-transform duration-500 select-none pointer-events-none"
          />
          <div className="mt-4 tracking-[0.5em] text-red-500 font-bold text-xs md:text-sm uppercase text-center">
            Final Awakening: Red Protocol
          </div>
        </motion.div>

        {/* Menu selections in Immersive UI Theme layout */}
        <div id="start-menu-items" className="w-full max-w-xs flex flex-col gap-4">
          {menuItems.map((item, idx) => {
            const isHovered = hoveredOption === idx;
            if (idx === 0) {
              // Primary button: Enter Game (Start Game)
              return (
                <motion.button
                  key={item.id}
                  id={`menu-item-${idx}`}
                  onMouseEnter={() => {
                    setHoveredOption(idx);
                    audio.playHover();
                  }}
                  onMouseLeave={() => setHoveredOption(null)}
                  onClick={item.onClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-8 py-4 bg-red-700/10 border border-red-600/50 hover:bg-red-600 hover:text-white transition-all duration-200 uppercase tracking-widest text-lg font-bold shadow-[0_0_15px_rgba(220,38,38,0.2)] text-center cursor-pointer overflow-hidden rounded-xs"
                >
                  <span className="relative z-10 text-red-500 group-hover:text-white transition-colors duration-200">
                    {item.label}
                  </span>
                  <div className="absolute inset-0 bg-red-600 opacity-0 group-hover:opacity-100 transition-all duration-200 blur-xs -z-10"></div>
                </motion.button>
              );
            } else {
              // Secondary buttons: Options
              return (
                <motion.button
                  key={item.id}
                  id={`menu-item-${idx}`}
                  onMouseEnter={() => {
                    setHoveredOption(idx);
                    audio.playHover();
                  }}
                  onMouseLeave={() => setHoveredOption(null)}
                  onClick={item.onClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-transparent border border-gray-700 hover:border-red-500 hover:text-white transition-colors duration-200 uppercase tracking-widest text-sm font-medium text-center cursor-pointer text-gray-400 rounded-xs"
                >
                  {item.label}
                </motion.button>
              );
            }
          })}
        </div>

      </div>

      {/* Bottom info section: 3-column Immersive UI grid with customizable bindings */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 z-10 mt-4 border-t border-red-950/20 pt-6">
        {/* Column 1: Character Control */}
        <div className="flex flex-col gap-2 p-4 bg-black/50 border-l-2 border-red-600/30">
          <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Character Control</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border border-red-500/50 flex items-center justify-center text-xs uppercase font-bold text-red-400 bg-red-950/20">
              {getFriendlyKeyName(bindings.moveLeft)}
            </div>
            <span className="text-xs text-gray-400 font-mono">Move Left (เดินซ้าย)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border border-red-500/50 flex items-center justify-center text-xs uppercase font-bold text-red-400 bg-red-950/20">
              {getFriendlyKeyName(bindings.moveRight)}
            </div>
            <span className="text-xs text-gray-400 font-mono">Move Right (เดินขวา)</span>
          </div>
        </div>

        {/* Column 2: Action Mapping */}
        <div className="flex flex-col gap-2 p-4 bg-black/50 border-l-2 border-red-600/30">
          <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Action Mapping</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-8 border border-red-500/50 flex items-center justify-center text-[10px] uppercase font-bold text-red-400 bg-red-950/20 truncate px-1">
              {getFriendlyKeyName(bindings.jump)}
            </div>
            <span className="text-xs text-gray-400 font-mono">Jump (กระโดด)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border border-red-500/50 flex items-center justify-center text-xs uppercase font-bold text-red-400 bg-red-950/20">
              {getFriendlyKeyName(bindings.attack)}
            </div>
            <span className="text-xs text-gray-400 font-mono">Attack (ยิงโจมตี) / Special ({getFriendlyKeyName(bindings.special)})</span>
          </div>
        </div>

        {/* Column 3: Server Metadata & Status */}
        <div className="flex flex-col justify-end items-start md:items-end gap-1 opacity-60 text-xs text-gray-400 font-mono">
          <span className="text-[10px] uppercase tracking-widest text-gray-500">Server: AS-CENTRAL-01</span>
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Latency: 24ms (Stable)</span>
          <span className="text-[10px] uppercase tracking-widest text-red-500 font-semibold animate-pulse">● Protocol: Red Active</span>
        </div>
      </div>

    </div>
  );
}
