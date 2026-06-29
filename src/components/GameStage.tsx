import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { KeyBindings, GameSettings } from '../types';
import { audio } from '../utils/audio';
import { getFriendlyKeyName } from './OptionsModal';
import { 
  Home, Settings, Zap, RotateCcw, Volume2, Shield, Flame, Play, Sparkles,
  Gamepad2, Swords, Move, HelpCircle, Trophy, RefreshCw, ChevronRight
} from 'lucide-react';

interface GameStageProps {
  bindings: KeyBindings;
  settings: GameSettings;
  onBackToMenu: () => void;
  onOpenOptions: () => void;
}

// Global Game Interfaces
interface GameParticle {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface GameEnemy {
  id: number;
  position: [number, number, number];
  hp: number;
  maxHp: number;
  facing: 'left' | 'right';
  animState: 'STAND' | 'WALK';
  isDying: boolean;
  dyingTimer: number;
  knockbackVel: [number, number, number];
  knockbackTimer: number;
  flashState: 'none' | 'red' | 'white';
  flashTimer: number;
  attackCooldown: number;
}

interface GameItem {
  id: number;
  position: [number, number, number];
  active: boolean;
  pulseY: number;
}

interface GameBoss {
  position: [number, number, number];
  hp: number;
  maxHp: number;
  facing: 'left' | 'right';
  animState: 'STAND' | 'WALK';
  pattern: 'IDLE' | 'DASH' | 'PRE_ATTACK' | 'ATTACK' | 'DYING';
  patternTimer: number;
  speed: number;
  targetPos: [number, number, number];
  scale: [number, number, number];
  flashState: 'none' | 'red' | 'white';
  flashTimer: number;
}

interface GameFireball {
  id: number;
  position: [number, number, number];
  targetPos: [number, number, number];
  progress: number;
  speed: number;
  damageDealt: boolean;
  impacted: boolean;
}

interface WarpGate {
  position: [number, number, number];
  active: boolean;
}

// Boss Sprite Component (Billboarding, 4 frames, 2 rows, flying)
interface BossSpriteProps {
  position: [number, number, number];
  facing: 'left' | 'right';
  animState: 'STAND' | 'WALK';
  frameIndex: number;
  flashState: 'none' | 'red' | 'white';
  scale: [number, number, number];
}

function BossSprite({ position, facing, animState, frameIndex, flashState, scale }: BossSpriteProps) {
  const texture = useTexture('https://res.cloudinary.com/dsucg33fv/image/upload/v1782709455/boss_e8jti1.png');
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(0.25, 0.5); // 4 columns, 2 rows
    }
  }, [texture]);

  // Row 1 (Stand): offset.y = 0.5, Row 2 (Walk): offset.y = 0.0
  const rowY = animState === 'STAND' ? 0.5 : 0.0;

  if (texture) {
    texture.offset.set((frameIndex % 4) * 0.25, rowY);
  }

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = camera.rotation.y;
    }
  });

  // Flash colors
  let materialColor = new THREE.Color('#ffffff');
  let emissiveColor = new THREE.Color('#000000');
  let emissiveIntensity = 0;

  if (flashState === 'red') {
    materialColor = new THREE.Color('#ff4444');
    emissiveColor = new THREE.Color('#ff0000');
    emissiveIntensity = 2.5;
  } else if (flashState === 'white') {
    materialColor = new THREE.Color('#ffffff');
    emissiveColor = new THREE.Color('#ffffff');
    emissiveIntensity = 5.0; // intense solid white glow
  }

  // Float altitude Y
  const floatHeight = 2.0 + Math.sin(Date.now() * 0.004) * 0.2;

  return (
    <group position={[position[0], position[1] + floatHeight, position[2]]}>
      <mesh ref={meshRef} castShadow scale={[scale[0] * (facing === 'left' ? -1 : 1), scale[1], scale[2]]}>
        <planeGeometry args={[2.5, 2.5]} />
        {texture && (
          <meshStandardMaterial 
            map={texture} 
            transparent 
            alphaTest={0.4} 
            side={THREE.DoubleSide} 
            color={materialColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={1.0}
            metalness={0.0}
          />
        )}
      </mesh>

      {/* Shadow projection on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -floatHeight + 0.02, 0]}>
        <ringGeometry args={[0.0, 0.8, 16]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.35} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
}

// NPC Sprite Component (Billboarding, 4 frames, 2 rows)
interface NPCSpriteProps {
  position: [number, number, number];
  facing: 'left' | 'right';
  animState: 'STAND' | 'WALK';
  frameIndex: number;
}

function NPCSprite({ position, facing, animState, frameIndex }: NPCSpriteProps) {
  const texture = useTexture('https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/npc1_pdraha.png');
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(0.25, 0.5); // 4 columns, 2 rows
    }
  }, [texture]);

  // Row 1 (Stand): offset.y = 0.5, Row 2 (Walk): offset.y = 0.0
  const rowY = animState === 'STAND' ? 0.5 : 0.0;

  if (texture) {
    texture.offset.set((frameIndex % 4) * 0.25, rowY);
  }

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = camera.rotation.y;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} position={[0, 0.9, 0]} castShadow scale={[facing === 'left' ? -1 : 1, 1, 1]}>
        <planeGeometry args={[2.0, 2.0]} />
        {texture && (
          <meshBasicMaterial 
            map={texture} 
            transparent 
            alphaTest={0.4} 
            side={THREE.DoubleSide} 
          />
        )}
      </mesh>

      {/* Shadow underneath */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.0, 0.5, 16]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
}

// Fireball projectile sprite
interface FireballSpriteProps {
  position: [number, number, number];
  targetPos: [number, number, number];
  progress: number;
}

function FireballSprite({ position, targetPos, progress }: FireballSpriteProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = camera.rotation.y;
      meshRef.current.rotation.z += 0.08;
    }
  });

  // Parabolic arc formula
  const arcHeight = Math.sin(progress * Math.PI) * 5.0;
  // interpolate X and Z between start and target
  const currentX = position[0] + (targetPos[0] - position[0]) * progress;
  const currentZ = position[2] + (targetPos[2] - position[2]) * progress;
  const currentY = position[1] + (targetPos[1] - position[1]) * progress + arcHeight;

  return (
    <group position={[currentX, currentY, currentZ]}>
      <mesh ref={meshRef} castShadow>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshStandardMaterial 
          color="#f97316" 
          emissive="#ef4444" 
          emissiveIntensity={3.0} 
        />
      </mesh>

      {/* Fire aura ring trail */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.1, 0.3, 8]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.4} />
      </mesh>

      {/* Target landing warning reticle drawn on the ground */}
      {progress < 0.98 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -currentY + 0.02, 0]}>
          <ringGeometry args={[0.5, 0.7 + (1.0 - progress) * 0.5, 32]} />
          <meshBasicMaterial 
            color="#ef4444" 
            transparent 
            opacity={0.7} 
            side={THREE.DoubleSide} 
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

// Warp Gate portal sprite
interface WarpGateSpriteProps {
  position: [number, number, number];
}

function WarpGateSprite({ position }: WarpGateSpriteProps) {
  const torusRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (torusRef.current) {
      torusRef.current.rotation.z = state.clock.getElapsedTime() * 1.5;
    }
  });

  return (
    <group position={position}>
      {/* Visual ring */}
      <mesh ref={torusRef} position={[0, 1.2, 0]}>
        <torusGeometry args={[1.2, 0.15, 16, 64]} />
        <meshStandardMaterial 
          color="#38bdf8" 
          emissive="#6366f1" 
          emissiveIntensity={3.5} 
        />
      </mesh>

      {/* Portal core glow */}
      <mesh position={[0, 1.2, 0]}>
        <planeGeometry args={[2.0, 2.0]} />
        <meshBasicMaterial 
          color="#1e1b4b" 
          transparent 
          opacity={0.7} 
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Swirling energy floor indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.1, 1.5, 32]} />
        <meshBasicMaterial 
          color="#6366f1" 
          transparent 
          opacity={0.6} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
}

// 1. Ground Plane with Repeating Texture
function Ground() {
  const texture = useTexture('https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png');
  
  useEffect(() => {
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(30, 30); // Tiling เล็กหน่อย
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
    }
  }, [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial 
        map={texture} 
        roughness={0.9} 
        metalness={0.1} 
      />
    </mesh>
  );
}

// 2. Beautiful Skybox / Atmosphere Grid
function SpaceGrid() {
  return (
    <gridHelper 
      args={[100, 50, '#ef4444', '#1f1f23']} 
      position={[0, 0.02, 0]} 
    />
  );
}

// 3. Enemy Sprite Component (Billboarding, 4 frames per row, 2 rows, default facing right)
interface EnemySpriteProps {
  position: [number, number, number];
  facing: 'left' | 'right';
  animState: 'STAND' | 'WALK';
  frameIndex: number;
  flashState: 'none' | 'red' | 'white';
}

function EnemySprite({ position, facing, animState, frameIndex, flashState }: EnemySpriteProps) {
  const texture = useTexture('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/enemy.png');
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(0.25, 0.5); // 4 columns, 2 rows
    }
  }, [texture]);

  // Row 1 (Stand): offset.y = 0.5, Row 2 (Walk): offset.y = 0.0
  const rowY = animState === 'STAND' ? 0.5 : 0.0;

  if (texture) {
    texture.offset.set((frameIndex % 4) * 0.25, rowY);
  }

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = camera.rotation.y;
    }
  });

  // Default facing right, flip on x if facing left
  const scaleX = facing === 'left' ? -2.0 : 2.0;

  // Flash colors
  let materialColor = new THREE.Color('#ffffff');
  let emissiveColor = new THREE.Color('#000000');
  let emissiveIntensity = 0;

  if (flashState === 'red') {
    materialColor = new THREE.Color('#ff4444');
    emissiveColor = new THREE.Color('#ff0000');
    emissiveIntensity = 2.5;
  } else if (flashState === 'white') {
    materialColor = new THREE.Color('#ffffff');
    emissiveColor = new THREE.Color('#ffffff');
    emissiveIntensity = 5.0; // intense solid white glow
  }

  return (
    <group position={position}>
      <mesh ref={meshRef} position={[0, 0.9, 0]} castShadow scale={[facing === 'left' ? -1 : 1, 1, 1]}>
        <planeGeometry args={[2.0, 2.0]} />
        {texture && (
          <meshStandardMaterial 
            map={texture} 
            transparent 
            alphaTest={0.4} 
            side={THREE.DoubleSide} 
            color={materialColor}
            emissive={emissiveColor}
            emissiveIntensity={emissiveIntensity}
            roughness={1.0}
            metalness={0.0}
          />
        )}
      </mesh>

      {/* Shadow shadow projection underneath enemy */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.0, 0.5, 16]} />
        <meshBasicMaterial 
          color="#000000" 
          transparent 
          opacity={0.3} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
}

// 4. Potion Item Sprite Component (Billboarding, floats up and down)
interface ItemSpriteProps {
  position: [number, number, number];
  pulseY: number;
}

function ItemSprite({ position, pulseY }: ItemSpriteProps) {
  const texture = useTexture('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/potion.png');
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
    }
  }, [texture]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y = camera.rotation.y;
    }
  });

  const floatOffset = Math.sin(pulseY) * 0.15;

  return (
    <group position={[position[0], position[1] + floatOffset, position[2]]}>
      <mesh ref={meshRef} position={[0, 0.6, 0]} castShadow>
        <planeGeometry args={[1.2, 1.2]} />
        {texture && (
          <meshBasicMaterial 
            map={texture} 
            transparent 
            alphaTest={0.4} 
            side={THREE.DoubleSide} 
          />
        )}
      </mesh>
      
      {/* Healing aura ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.3, 0.5, 16]} />
        <meshBasicMaterial 
          color="#22c55e" 
          transparent 
          opacity={0.5} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
}

// 5. Expanding Skill Rings
function SkillRing({ position, radius, opacity }: { position: [number, number, number]; radius: number; opacity: number }) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.rotation.x = -Math.PI / 2;
    }
  });

  if (radius <= 0.1) return null;

  return (
    <mesh ref={ringRef} position={[position[0], 0.05, position[2]]}>
      <ringGeometry args={[radius - 0.15, radius, 32]} />
      <meshBasicMaterial 
        color="#38bdf8" 
        transparent 
        opacity={opacity} 
        side={THREE.DoubleSide} 
        depthWrite={false}
      />
    </mesh>
  );
}

// 6. Punch Hitbox Visualizer
function HitboxVisual({ position, active, facing }: { position: [number, number, number]; active: boolean; facing: 'left' | 'right' }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && active) {
      const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 30) * 0.1;
      meshRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  if (!active) return null;

  // Position hitbox slightly ahead of player based on facing
  const offsetDistance = 1.2;
  const hx = position[0] + (facing === 'right' ? offsetDistance : -offsetDistance);
  const hy = position[1] + 0.3;
  const hz = position[2];

  return (
    <mesh position={[hx, hy, hz]}>
      <sphereGeometry args={[0.6, 16, 16]} />
      <meshBasicMaterial 
        color="#38bdf8" 
        wireframe 
        transparent 
        opacity={0.7} 
      />
    </mesh>
  );
}

// 7. Action Particles
function ParticlesGroup({ particles }: { particles: GameParticle[] }) {
  return (
    <>
      {particles.map((p) => (
        <mesh key={p.id} position={p.position}>
          <boxGeometry args={[p.size, p.size, p.size]} />
          <meshBasicMaterial 
            color={p.color} 
            transparent 
            opacity={1 - p.life / p.maxLife} 
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

// 8. Billboard Player Sprite Component
interface PlayerSpriteProps {
  position: [number, number, number];
  facing: 'left' | 'right';
  animState: 'IDLE' | 'WALK' | 'ATTACK' | 'DANCE';
  frameIndex: number;
  isPunching: boolean;
}

function PlayerSprite({ position, facing, animState, frameIndex, isPunching }: PlayerSpriteProps) {
  const texture = useTexture('https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png');
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(0.25, 0.25);
    }
  }, [texture]);

  // Texture frame offsets coordinates
  // Row 1 (Idle): offset.y = 0.75
  // Row 2 (Walk): offset.y = 0.50
  // Row 3 (Attack): offset.y = 0.25
  // Row 4 (Dance): offset.y = 0.00
  let rowY = 0.75;
  if (animState === 'WALK') rowY = 0.50;
  if (animState === 'ATTACK') rowY = 0.25;
  if (animState === 'DANCE') rowY = 0.00;

  if (texture) {
    texture.offset.set(frameIndex * 0.25, rowY);
  }

  useFrame(() => {
    if (meshRef.current) {
      // billboard: Always rotate around Y-axis to face the camera
      meshRef.current.rotation.y = camera.rotation.y;
    }
  });

  return (
    <group position={position}>
      {/* Sprite Mesh */}
      <mesh ref={meshRef} position={[0, 0.9, 0]} castShadow scale={[facing === 'left' ? -1 : 1, 1, 1]}>
        <planeGeometry args={[2.0, 2.0]} />
        {texture && (
          <meshBasicMaterial 
            map={texture} 
            transparent 
            alphaTest={0.4} 
            side={THREE.DoubleSide} 
          />
        )}
      </mesh>

      {/* Decorative underfoot ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.5, 0.7, 16]} />
        <meshBasicMaterial 
          color={isPunching ? "#38bdf8" : "#ef4444"} 
          transparent 
          opacity={0.5} 
          side={THREE.DoubleSide} 
        />
      </mesh>
    </group>
  );
}

// 9. Smoothed Camera Controller following Player
function CameraFollow({ playerPos }: { playerPos: [number, number, number] }) {
  const { camera } = useThree();

  useFrame(() => {
    // Rigid back-top tracking offset position
    const targetCamX = playerPos[0];
    const targetCamY = playerPos[1] + 6.5;
    const targetCamZ = playerPos[2] + 9.0;

    // Smooth lerping
    camera.position.x += (targetCamX - camera.position.x) * 0.12;
    camera.position.y += (targetCamY - camera.position.y) * 0.12;
    camera.position.z += (targetCamZ - camera.position.z) * 0.12;

    // Direct attention focal point
    camera.lookAt(playerPos[0], playerPos[1] + 0.8, playerPos[2]);
  });

  return null;
}

const DIALOGUES = [
  {
    speaker: 'npc',
    name: 'ผู้ชี้นำโบราณ (NPC)',
    text: 'สุดยอดมาก! ท่านสามารถปราบราชาอสูรและฝ่าด่านประตูนรกโลกันตร์นี้ได้สำเร็จ!',
    side: 'right',
  },
  {
    speaker: 'player',
    name: 'อัศวินผู้พิทักษ์ (Player)',
    text: 'ขอบคุณท่านมาก... พลังไฟโลกันตร์และอุกกาบาตของมันเกือบแผดเผาจิตวิญญาณข้าไปแล้ว',
    side: 'left',
  },
  {
    speaker: 'npc',
    name: 'ผู้ชี้นำโบราณ (NPC)',
    text: 'ข้าเฝ้ามองดูอยู่จากดินแดนสวรรค์เบื้องบน วงแหวนพลังระเบิดพิเศษของท่านสะเทือนสิบทิศทาง!',
    side: 'right',
  },
  {
    speaker: 'player',
    name: 'อัศวินผู้พิทักษ์ (Player)',
    text: 'ข้าเพียงแค่ทำตามหน้าที่ เพื่อนำพาสันติภาพที่แท้จริงกลับคืนสู่ห้วงมิตินี้อีกครั้ง',
    side: 'left',
  },
  {
    speaker: 'npc',
    name: 'ผู้ชี้นำโบราณ (NPC)',
    text: 'สมกับเป็นอัศวินแห่งตำนาน! พลังใจท่านแข็งแกร่งดั่งภูผา ชาวเมืองทุกคนจะแซ่ซ้องและยกย่องท่านตราบนานเท่านาน',
    side: 'right',
  },
  {
    speaker: 'player',
    name: 'อัศวินผู้พิทักษ์ (Player)',
    text: 'เมื่อความมืดเข้าคืบคลาน... ข้าพร้อมที่จะลุกขึ้นสู้เสมอ ขอให้เกียรติยศและจิตวิญญาณแห่งการต่อสู้นี้ส่องประกาย',
    side: 'left',
  },
  {
    speaker: 'npc',
    name: 'ผู้ชี้นำโบราณ (NPC)',
    text: 'บัดนี้ ประตูมิติเวิร์ปโฮลโบราณพร้อมต้อนรับท่านกลับสู่ดินแดนแห่งมาตุภูมิของอารยธรรมมนุษย์แล้วอย่างสมเกียรติ!',
    side: 'right',
  },
  {
    speaker: 'player',
    name: 'อัศวินผู้พิทักษ์ (Player)',
    text: 'สันติภาพคือสิ่งคุ้มค่าที่สุด ข้าพร้อมที่จะกลับบ้านแล้ว... สันติภาพและความสุขจงสถิตคู่มิตินี้ชั่วนิรันดร์!',
    side: 'left',
  }
];

// 10. Primary Scene Controller containing core canvas game loop
export default function GameStage({
  bindings,
  settings,
  onBackToMenu,
  onOpenOptions,
}: GameStageProps) {
  // Gameplay Reactive States
  const [score, setScore] = useState(0);
  const [playerHp, setPlayerHp] = useState(5);
  const [specialCharge, setSpecialCharge] = useState(100); // 0 to 100%
  const [isDead, setIsDead] = useState(false);
  const [activeAnim, setActiveAnim] = useState<'IDLE' | 'WALK' | 'ATTACK' | 'DANCE'>('IDLE');
  const [frameIndex, setFrameIndex] = useState(0);

  // Sound level display
  const [currentVolume, setCurrentVolume] = useState(settings.soundVolume);

  // Active inputs states tracking
  const [isPunching, setIsPunching] = useState(false);
  const [specialRingRadius, setSpecialRingRadius] = useState(0);
  const [specialRingOpacity, setSpecialRingOpacity] = useState(0);

  // Key tracking sets
  const keysPressed = useRef<Set<string>>(new Set());

  // Player position state
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  const playerPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const playerFacing = useRef<'left' | 'right'>('right');

  // Enemies state
  const [enemies, setEnemies] = useState<GameEnemy[]>([]);
  const enemiesRef = useRef<GameEnemy[]>([]);

  // Items state
  const [items, setItems] = useState<GameItem[]>([]);
  const itemsRef = useRef<GameItem[]>([]);

  // Particles state
  const [particles, setParticles] = useState<GameParticle[]>([]);
  const particlesRef = useRef<GameParticle[]>([]);
  const nextParticleId = useRef(0);

  // Boss, items, warp, ending states
  const [defeatedCount, setDefeatedCount] = useState(0);
  const defeatedCountRef = useRef(0);

  const [boss, setBoss] = useState<GameBoss | null>(null);
  const bossRef = useRef<GameBoss | null>(null);

  const [fireballs, setFireballs] = useState<GameFireball[]>([]);
  const fireballsRef = useRef<GameFireball[]>([]);

  const [warpGate, setWarpGate] = useState<WarpGate | null>(null);

  const [gamePhase, setGamePhase] = useState<'PLAYING' | 'ENDING'>('PLAYING');
  const [endingDialogueIndex, setEndingDialogueIndex] = useState(0);

  const [npcPos, setNpcPos] = useState<[number, number, number]>([0, 0, -10]);
  const npcPosRef = useRef<[number, number, number]>([0, 0, -10]);
  const [npcFacing, setNpcFacing] = useState<'left' | 'right'>('right');
  const [npcAnimState, setNpcAnimState] = useState<'STAND' | 'WALK'>('WALK');

  // Enemy random spawn ticker cooldown (1 to 3 seconds in ticks: 33 to 100)
  const spawnCooldown = useRef<number>(Math.floor(Math.random() * 60) + 40);

  // Idle timer for automatic dancing (เต้นเมื่อหยุดเดินนานกว่า 4 วินาที)
  const idleTimer = useRef<number | null>(null);

  // Animation frame timing control variables
  const lastFrameTime = useRef<number>(0);

  // Trigger 3D Particle explosion
  const createExplosion = (pos: [number, number, number], color: string, count: number = 10) => {
    const newParticles: GameParticle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.15 + 0.05;
      const vy = Math.random() * 0.15 + 0.05;
      newParticles.push({
        id: nextParticleId.current++,
        position: [pos[0], pos[1] + 0.5, pos[2]],
        velocity: [Math.cos(angle) * speed, vy, Math.sin(angle) * speed],
        color,
        size: Math.random() * 0.15 + 0.08,
        life: 0,
        maxLife: Math.random() * 30 + 15,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  // Build random enemies and items across the 3D map
  const resetEnemiesAndItems = () => {
    // 1. Spawn enemies based on difficulty
    const enemyCount = settings.difficulty === 'HARD' ? 5 : settings.difficulty === 'NORMAL' ? 3 : 2;
    const freshEnemies: GameEnemy[] = [];
    for (let i = 0; i < enemyCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 12 + 6;
      freshEnemies.push({
        id: i,
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        hp: 2, // 2 hits to defeat
        maxHp: 2,
        facing: Math.random() > 0.5 ? 'left' : 'right',
        animState: 'STAND',
        isDying: false,
        dyingTimer: 0,
        knockbackVel: [0, 0, 0],
        knockbackTimer: 0,
        flashState: 'none',
        flashTimer: 0,
        attackCooldown: Math.random() * 20, // initial offset
      });
    }
    setEnemies(freshEnemies);
    enemiesRef.current = freshEnemies;

    // 2. Spawn items (Potion) randomly across the map
    const itemCount = 4;
    const freshItems: GameItem[] = [];
    for (let i = 0; i < itemCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 15 + 4;
      freshItems.push({
        id: i,
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        active: true,
        pulseY: Math.random() * Math.PI,
      });
    }
    setItems(freshItems);
    itemsRef.current = freshItems;
  };

  // Reset core round
  const handleResetGame = () => {
    audio.playStartGame();
    setScore(0);
    setPlayerHp(5);
    setIsDead(false);
    setSpecialCharge(100);
    setActiveAnim('IDLE');
    setFrameIndex(0);
    setPlayerPos([0, 0, 0]);
    playerPosRef.current = [0, 0, 0];
    playerFacing.current = 'right';
    particlesRef.current = [];
    setParticles([]);
    
    // Reset boss & ending variables
    setDefeatedCount(0);
    defeatedCountRef.current = 0;
    setBoss(null);
    bossRef.current = null;
    setFireballs([]);
    fireballsRef.current = [];
    setWarpGate(null);
    setGamePhase('PLAYING');
    setEndingDialogueIndex(0);
    setNpcPos([0, 0, -10]);
    npcPosRef.current = [0, 0, -10];
    setNpcFacing('right');
    setNpcAnimState('WALK');
    spawnCooldown.current = Math.floor(Math.random() * 60) + 40;

    resetEnemiesAndItems();
  };

  useEffect(() => {
    handleResetGame();
  }, [settings.difficulty]);

  // Core WASD inputs handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDead || gamePhase === 'ENDING') return;

      const key = e.key.toLowerCase();
      keysPressed.current.add(key);

      // Reset idle timer for dance
      if (idleTimer.current) {
        clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }

      const attackKey = bindings.attack.toLowerCase();
      const specialKey = bindings.special.toLowerCase();

      // Attack: J key or bindings or P key
      if ((key === attackKey || key === 'p' || key === 'j') && !isPunching) {
        setIsPunching(true);
        setActiveAnim('ATTACK');
        setFrameIndex(0);
        audio.playAttack();

        // Check melee hitbox overlaps with enemies
        setTimeout(() => {
          const px = playerPosRef.current[0];
          const pz = playerPosRef.current[2];
          const isRight = playerFacing.current === 'right';
          const hx = px + (isRight ? 1.4 : -1.4);
          const hz = pz;

          // Check hit on Boss
          const b = bossRef.current;
          if (b && b.pattern !== 'DYING') {
            const bdist = Math.sqrt(Math.pow(b.position[0] - hx, 2) + Math.pow(b.position[2] - hz, 2));
            if (bdist < 2.5) {
              b.hp -= 1;
              b.flashState = 'white';
              b.flashTimer = 8;
              createExplosion([b.position[0], 2.0, b.position[2]], '#ef4444', 15);
              if (b.hp <= 0) {
                b.pattern = 'DYING';
                b.patternTimer = 60; // 2 seconds of dying drama
                audio.playExplosion();
              } else {
                audio.playHover();
              }
              setBoss({ ...b });
            }
          }

          let hitAny = false;
          const nextEnemies = enemiesRef.current.map((e) => {
            if (e.isDying) return e;
            const dist = Math.sqrt(Math.pow(e.position[0] - hx, 2) + Math.pow(e.position[2] - hz, 2));
            if (dist < 1.6) {
              hitAny = true;
              e.hp -= 1;
              if (e.hp === 1) {
                // First hit: knock back opposite to player's facing direction
                audio.playHover();
                e.knockbackTimer = 10;
                const kbDirX = isRight ? 0.6 : -0.6;
                const kbDirZ = 0;
                e.knockbackVel = [kbDirX, 0, kbDirZ];
                e.flashState = 'white';
                e.flashTimer = 8;
                createExplosion(e.position, '#ffffff', 8);
              } else if (e.hp <= 0) {
                // Second hit: fly out of screen flashing white
                audio.playExplosion();
                e.isDying = true;
                e.dyingTimer = 30;
                const kbDirX = isRight ? 0.9 : -0.9;
                e.knockbackVel = [kbDirX, 0.45, 0];
                e.flashState = 'white';
                createExplosion(e.position, '#ef4444', 22);
                setScore((s) => s + 200);

                // Increment defeated normal enemies
                const nextDefeated = defeatedCountRef.current + 1;
                defeatedCountRef.current = nextDefeated;
                setDefeatedCount(nextDefeated);
              }
            }
            return e;
          });

          if (hitAny) {
            setEnemies([...nextEnemies]);
            enemiesRef.current = nextEnemies;
          }
        }, 150);

        // Reset punch state shortly
        setTimeout(() => {
          setIsPunching(false);
          setActiveAnim('IDLE');
        }, 300);
      }

      // Special energy expanding Ring: O key or bindings
      if ((key === specialKey || key === 'o' || key === 'k') && specialCharge >= 100) {
        audio.playSpecial();
        setSpecialCharge(0);
        setSpecialRingRadius(0.5);
        setSpecialRingOpacity(0.9);

        // Gradually expand special Ring size
        let currentRadius = 0.5;
        const expandInterval = setInterval(() => {
          currentRadius += 0.8;
          setSpecialRingRadius(currentRadius);
          setSpecialRingOpacity((prev) => Math.max(0, prev - 0.08));

          // Real-time ring collision overlap test
          const px = playerPosRef.current[0];
          const pz = playerPosRef.current[2];

          // Check hit on Boss
          const b = bossRef.current;
          if (b && b.pattern !== 'DYING') {
            const bdist = Math.sqrt(Math.pow(b.position[0] - px, 2) + Math.pow(b.position[2] - pz, 2));
            if (bdist < currentRadius && bdist > currentRadius - 1.8) {
              b.hp -= 3; // Special ring deals 3 damage to the Boss!
              b.flashState = 'white';
              b.flashTimer = 12;
              createExplosion([b.position[0], 2.0, b.position[2]], '#38bdf8', 20);
              audio.playExplosion();

              if (b.hp <= 0) {
                b.pattern = 'DYING';
                b.patternTimer = 60; // 2 seconds
              }
              setBoss({ ...b });
            }
          }

          const nextEnemies = enemiesRef.current.map((e) => {
            if (e.isDying) return e;
            const dist = Math.sqrt(Math.pow(e.position[0] - px, 2) + Math.pow(e.position[2] - pz, 2));
            if (dist < currentRadius && dist > currentRadius - 1.5) {
              e.hp = 0;
              e.isDying = true;
              e.dyingTimer = 30;
              const angle = Math.atan2(e.position[2] - pz, e.position[0] - px);
              e.knockbackVel = [Math.cos(angle) * 1.1, 0.5, Math.sin(angle) * 1.1];
              e.flashState = 'white';
              createExplosion(e.position, '#38bdf8', 16);
              setScore((s) => s + 300);
              audio.playExplosion();

              // Increment defeated normal enemies
              const nextDefeated = defeatedCountRef.current + 1;
              defeatedCountRef.current = nextDefeated;
              setDefeatedCount(nextDefeated);
            }
            return e;
          });

          setEnemies([...nextEnemies]);
          enemiesRef.current = nextEnemies;

          if (currentRadius >= 12.0) {
            clearInterval(expandInterval);
            setSpecialRingRadius(0);
            setSpecialRingOpacity(0);
          }
        }, 30);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPunching, specialCharge, isDead, bindings, gamePhase]);

  // Main game logic loop inside a dynamic interval
  useEffect(() => {
    const loop = setInterval(() => {
      if (isDead) return;

      // --- ENDING PHASE SEQUENCE ---
      if (gamePhase === 'ENDING') {
        // Force player to center and face forward
        playerPosRef.current = [0, 0, 0];
        setPlayerPos([0, 0, 0]);
        playerFacing.current = 'right';
        setActiveAnim('IDLE');

        // NPC AI: walk from [0, 0, -10] to [0, 0, -2]
        const targetX = 0;
        const targetZ = -2.0;
        const ndx = targetX - npcPosRef.current[0];
        const ndz = targetZ - npcPosRef.current[2];
        const ndist = Math.sqrt(ndx * ndx + ndz * ndz);

        if (ndist > 0.1) {
          const walkSpeed = 0.08;
          const nextNpcX = npcPosRef.current[0] + (ndx / ndist) * walkSpeed;
          const nextNpcZ = npcPosRef.current[2] + (ndz / ndist) * walkSpeed;
          npcPosRef.current = [nextNpcX, 0, nextNpcZ];
          setNpcPos([nextNpcX, 0, nextNpcZ]);
          setNpcFacing('right');
          setNpcAnimState('WALK');
        } else {
          npcPosRef.current = [targetX, 0, targetZ];
          setNpcPos([targetX, 0, targetZ]);
          setNpcAnimState('STAND');
        }

        // Ticker animation frame index
        const now = Date.now();
        if (now - lastFrameTime.current > 120) {
          setFrameIndex((prev) => (prev + 1) % 4);
          lastFrameTime.current = now;
        }

        // Update particles
        const nextParticles = particlesRef.current
          .map((p) => {
            p.position[0] += p.velocity[0];
            p.position[1] += p.velocity[1];
            p.position[2] += p.velocity[2];
            p.life += 1;
            return p;
          })
          .filter((p) => p.life < p.maxLife);
        particlesRef.current = nextParticles;
        setParticles(nextParticles);

        return; // Halt regular gameplay mechanics during the ending dialogue
      }

      // Charge special ring
      setSpecialCharge((prev) => Math.min(100, prev + 1.2));

      // Handle 8-directional vector calculation
      let dx = 0;
      let dz = 0;

      const moveLeftKey = bindings.moveLeft.toLowerCase();
      const moveRightKey = bindings.moveRight.toLowerCase();

      if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) dz -= 1;
      if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) dz += 1;
      if (keysPressed.current.has('a') || keysPressed.current.has('arrowleft') || keysPressed.current.has(moveLeftKey)) dx -= 1;
      if (keysPressed.current.has('d') || keysPressed.current.has('arrowright') || keysPressed.current.has(moveRightKey)) dx += 1;

      // Normalize diagonal vector to prevent accelerated diagonal movement
      let speed = 0.16;
      if (settings.difficulty === 'HARD') speed = 0.22;
      if (settings.difficulty === 'EASY') speed = 0.12;

      if (dx !== 0 && dz !== 0) {
        const factor = 1 / Math.sqrt(2);
        dx *= factor;
        dz *= factor;
      }

      const isMoving = dx !== 0 || dz !== 0;

      // Update positions
      if (isMoving) {
        const currentPos = playerPosRef.current;
        const nextX = Math.max(-45, Math.min(45, currentPos[0] + dx * speed));
        const nextZ = Math.max(-45, Math.min(45, currentPos[2] + dz * speed));

        playerPosRef.current = [nextX, 0, nextZ];
        setPlayerPos([nextX, 0, nextZ]);

        // Facing direction flip
        if (dx < 0) {
          playerFacing.current = 'left';
        } else if (dx > 0) {
          playerFacing.current = 'right';
        }

        if (!isPunching) {
          setActiveAnim('WALK');
        }

        // Reset dance timer
        if (idleTimer.current) {
          clearTimeout(idleTimer.current);
          idleTimer.current = null;
        }
      } else {
        // Handle auto dance trigger when idle for over 4 seconds
        if (!isPunching && activeAnim !== 'DANCE') {
          setActiveAnim('IDLE');
          if (!idleTimer.current) {
            idleTimer.current = window.setTimeout(() => {
              setActiveAnim('DANCE');
            }, 4000);
          }
        }
      }

      // Sprite sheet frames ticker loop
      const now = Date.now();
      let frameSpeed = activeAnim === 'ATTACK' ? 65 : activeAnim === 'WALK' ? 120 : activeAnim === 'DANCE' ? 160 : 250;
      if (now - lastFrameTime.current > frameSpeed) {
        setFrameIndex((prev) => (prev + 1) % 4);
        lastFrameTime.current = now;
      }

      // Player coordinates
      const px = playerPosRef.current[0];
      const pz = playerPosRef.current[2];

      // --- RANDOM ENEMY SPANNING FROM ALL DIRECTIONS EVERY 1-3 SECONDS ---
      spawnCooldown.current--;
      if (spawnCooldown.current <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const spawnRadius = 16.0;
        const newEnemy: GameEnemy = {
          id: nextParticleId.current++,
          position: [px + Math.cos(angle) * spawnRadius, 0, pz + Math.sin(angle) * spawnRadius],
          hp: 2,
          maxHp: 2,
          facing: Math.random() > 0.5 ? 'left' : 'right',
          animState: 'STAND',
          isDying: false,
          dyingTimer: 0,
          knockbackVel: [0, 0, 0],
          knockbackTimer: 0,
          flashState: 'none',
          flashTimer: 0,
          attackCooldown: 30,
        };
        enemiesRef.current.push(newEnemy);
        setEnemies([...enemiesRef.current]);

        // random cooldown: 1-3 seconds (33 to 100 ticks)
        spawnCooldown.current = Math.floor(Math.random() * 67) + 33;
      }

      // Update enemies AI and collisions
      const nextEnemies = enemiesRef.current.map((e) => {
        // 1. Tick Flash timers
        if (e.flashTimer > 0) {
          e.flashTimer--;
          if (e.flashTimer === 0) {
            e.flashState = 'none';
          }
        }

        // 2. Tick attack cooldown
        if (e.attackCooldown > 0) {
          e.attackCooldown--;
        }

        // 3. Handle Knockback
        if (e.knockbackTimer > 0) {
          e.knockbackTimer--;
          e.position[0] = Math.max(-45, Math.min(45, e.position[0] + e.knockbackVel[0]));
          e.position[1] = Math.max(0, e.position[1] + e.knockbackVel[1]);
          e.position[2] = Math.max(-45, Math.min(45, e.position[2] + e.knockbackVel[2]));
          
          e.knockbackVel[0] *= 0.85;
          e.knockbackVel[1] *= 0.85;
          e.knockbackVel[2] *= 0.85;
          return e;
        }

        // 4. Handle Dying Sequence
        if (e.isDying) {
          e.dyingTimer--;
          e.position[0] += e.knockbackVel[0];
          e.position[1] += e.knockbackVel[1];
          e.position[2] += e.knockbackVel[2];
          e.knockbackVel[1] -= 0.02; // gravity fall

          if (e.dyingTimer % 4 < 2) {
            e.flashState = 'white';
          } else {
            e.flashState = 'none';
          }
          return e;
        }

        // 5. Normal AI pathfinding towards player
        const edx = px - e.position[0];
        const edz = pz - e.position[2];
        const dist = Math.sqrt(edx * edx + edz * edz);

        let enemySpeed = 0.06;
        if (settings.difficulty === 'HARD') enemySpeed = 0.09;
        if (settings.difficulty === 'EASY') enemySpeed = 0.04;

        if (dist > 1.2) {
          e.position[0] += (edx / dist) * enemySpeed;
          e.position[2] += (edz / dist) * enemySpeed;
          e.animState = 'WALK';
          e.facing = edx < 0 ? 'left' : 'right';
        } else {
          e.animState = 'STAND';
          if (e.attackCooldown <= 0) {
            e.flashState = 'red';
            e.flashTimer = 10;
            e.attackCooldown = 45; // Cooldown

            // Hurt player
            setPlayerHp((prev) => {
              const next = Math.max(0, prev - 1);
              if (next <= 0) {
                setIsDead(true);
                audio.playExplosion();
              } else {
                audio.playClick();
              }
              return next;
            });

            createExplosion([px, 0.2, pz], '#ff0000', 10);
          }
        }

        return e;
      });

      // Filter active and remove dead ones
      const aliveEnemies = nextEnemies.filter((e) => !e.isDying || e.dyingTimer > 0);

      // Keep spawning enemies up to match count
      const reqEnemyCount = settings.difficulty === 'HARD' ? 5 : settings.difficulty === 'NORMAL' ? 3 : 2;
      while (aliveEnemies.length < reqEnemyCount) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 12 + 10;
        aliveEnemies.push({
          id: nextParticleId.current++,
          position: [px + Math.cos(angle) * radius, 0, pz + Math.sin(angle) * radius],
          hp: 2,
          maxHp: 2,
          facing: Math.random() > 0.5 ? 'left' : 'right',
          animState: 'STAND',
          isDying: false,
          dyingTimer: 0,
          knockbackVel: [0, 0, 0],
          knockbackTimer: 0,
          flashState: 'none',
          flashTimer: 0,
          attackCooldown: 30,
        });
      }

      enemiesRef.current = aliveEnemies;
      setEnemies(aliveEnemies);

      // --- DYNAMIC BOSS encounter spawning after 10+ normal defeats ---
      if (defeatedCountRef.current >= 10 && bossRef.current === null && !warpGate) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 10;
        const newBoss: GameBoss = {
          position: [px + Math.cos(angle) * radius, 0, pz + Math.sin(angle) * radius],
          hp: 12,
          maxHp: 12,
          facing: 'left',
          animState: 'STAND',
          pattern: 'IDLE',
          patternTimer: 45, // 1.5s
          speed: 0.12,
          targetPos: [0, 0, 0],
          scale: [1, 1, 1],
          flashState: 'none',
          flashTimer: 0,
        };
        bossRef.current = newBoss;
        setBoss(newBoss);
        createExplosion(newBoss.position, '#ec4899', 30);
        audio.playSpecial();
      }

      // Update Boss state & actions
      const b = bossRef.current;
      if (b) {
        if (b.flashTimer > 0) {
          b.flashTimer--;
          if (b.flashTimer === 0) b.flashState = 'none';
        }

        b.patternTimer--;

        if (b.pattern === 'IDLE') {
          b.animState = 'STAND';
          b.scale = [1, 1, 1];
          b.facing = b.position[0] > px ? 'left' : 'right';

          if (b.patternTimer <= 0) {
            const rand = Math.random();
            if (rand < 0.6) {
              b.pattern = 'DASH';
              b.patternTimer = 35;
              const angle = Math.random() * Math.PI * 2;
              const dist = Math.random() * 8 + 3;
              b.targetPos = [px + Math.cos(angle) * dist, 0, pz + Math.sin(angle) * dist];
            } else {
              b.pattern = 'PRE_ATTACK';
              b.patternTimer = 40;
            }
          }
        } else if (b.pattern === 'DASH') {
          b.animState = 'WALK';
          b.scale = [1, 1, 1];
          const bdx = b.targetPos[0] - b.position[0];
          const bdz = b.targetPos[2] - b.position[2];
          const bdist = Math.sqrt(bdx * bdx + bdz * bdz);

          b.facing = bdx < 0 ? 'left' : 'right';

          if (bdist > 0.2 && b.patternTimer > 0) {
            const dashSpeed = 0.25;
            b.position[0] += (bdx / bdist) * dashSpeed;
            b.position[2] += (bdz / bdist) * dashSpeed;
          } else {
            b.pattern = 'IDLE';
            b.patternTimer = 30;
          }
        } else if (b.pattern === 'PRE_ATTACK') {
          b.animState = 'STAND';
          const warningPhase = b.patternTimer * 0.4;
          const squash = 1.0 + Math.sin(warningPhase) * 0.25;
          const stretch = 1.0 - Math.sin(warningPhase) * 0.15;
          b.scale = [stretch, squash, 1.0];

          if (b.patternTimer <= 0) {
            b.pattern = 'ATTACK';
            b.patternTimer = 20;
            b.scale = [1, 1, 1];

            // SHOOT FIREBALLS
            audio.playAttack();
            const newFireballs: GameFireball[] = [];
            const targets: [number, number][] = [
              [px, pz],
              [px + (Math.random() * 6 - 3.0), pz + (Math.random() * 6 - 3.0)],
              [px + (Math.random() * 6 - 3.0), pz + (Math.random() * 6 - 3.0)],
            ];

            targets.forEach((tgt) => {
              newFireballs.push({
                id: nextParticleId.current++,
                position: [b.position[0], 2.2, b.position[2]],
                targetPos: [tgt[0], 0, tgt[1]],
                progress: 0,
                speed: 0.012 + Math.random() * 0.006,
                damageDealt: false,
                impacted: false,
              });
            });

            fireballsRef.current = [...fireballsRef.current, ...newFireballs];
            setFireballs(fireballsRef.current);
          }
        } else if (b.pattern === 'ATTACK') {
          b.animState = 'STAND';
          b.scale = [1.2, 0.8, 1.0];
          if (b.patternTimer <= 0) {
            b.pattern = 'IDLE';
            b.patternTimer = 45;
          }
        } else if (b.pattern === 'DYING') {
          b.animState = 'STAND';
          b.position[1] += 0.04;
          if (b.patternTimer % 4 < 2) {
            b.flashState = 'white';
          } else {
            b.flashState = 'none';
          }

          if (b.patternTimer % 5 === 0) {
            createExplosion(
              [
                b.position[0] + (Math.random() * 2 - 1),
                b.position[1] + 2.0 + (Math.random() * 2 - 1),
                b.position[2] + (Math.random() * 2 - 1)
              ],
              '#f59e0b',
              8
            );
            audio.playClick();
          }

          if (b.patternTimer <= 0) {
            createExplosion([b.position[0], 2.0, b.position[2]], '#ffffff', 40);
            createExplosion([b.position[0], 2.0, b.position[2]], '#38bdf8', 40);
            audio.playExplosion();

            setWarpGate({
              position: [b.position[0], 0, b.position[2]],
              active: true,
            });

            bossRef.current = null;
            setBoss(null);
          }
        }

        if (bossRef.current) {
          bossRef.current.position[0] = Math.max(-40, Math.min(40, b.position[0]));
          bossRef.current.position[2] = Math.max(-40, Math.min(40, b.position[2]));
          setBoss({ ...bossRef.current });
        }
      }

      // Update fireballs progress
      const nextFireballs = fireballsRef.current.map((fb) => {
        if (fb.impacted) return fb;

        fb.progress += fb.speed;

        if (fb.progress >= 1.0) {
          fb.impacted = true;
          const fdist = Math.sqrt(Math.pow(fb.targetPos[0] - px, 2) + Math.pow(fb.targetPos[2] - pz, 2));
          if (fdist < 1.5 && !fb.damageDealt) {
            fb.damageDealt = true;
            setPlayerHp((prev) => {
              const next = Math.max(0, prev - 1);
              if (next <= 0) {
                setIsDead(true);
                audio.playExplosion();
              } else {
                audio.playClick();
              }
              return next;
            });
            createExplosion([px, 0.2, pz], '#ef4444', 12);
          } else {
            createExplosion(fb.targetPos, '#f57c00', 8);
            audio.playClick();
          }
        }
        return fb;
      });

      const activeFireballs = nextFireballs.filter((fb) => !fb.impacted);
      fireballsRef.current = activeFireballs;
      setFireballs(activeFireballs);

      // Warp Gate Proximity detection
      if (warpGate) {
        const wdist = Math.sqrt(Math.pow(warpGate.position[0] - px, 2) + Math.pow(warpGate.position[2] - pz, 2));
        if (wdist < 1.5) {
          audio.playSpecial();
          setGamePhase('ENDING');
          setPlayerPos([0, 0, 0]);
          playerPosRef.current = [0, 0, 0];
          setNpcPos([0, 0, -10]);
          npcPosRef.current = [0, 0, -10];
          setNpcAnimState('WALK');
          setNpcFacing('right');
          setEndingDialogueIndex(0);

          setEnemies([]);
          enemiesRef.current = [];
          setFireballs([]);
          fireballsRef.current = [];
        }
      }

      // 6. Items pickup
      const nextItems = itemsRef.current.map((item) => {
        if (!item.active) return item;

        item.pulseY += 0.05;

        const idist = Math.sqrt(Math.pow(item.position[0] - px, 2) + Math.pow(item.position[2] - pz, 2));
        if (idist < 1.2) {
          item.active = false;
          audio.playHeal();
          setPlayerHp((prev) => Math.min(5, prev + 1));
          createExplosion(item.position, '#22c55e', 15);

          // Respawn timer
          setTimeout(() => {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 16 + 5;
            const newItem: GameItem = {
              id: nextParticleId.current++,
              position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
              active: true,
              pulseY: Math.random() * Math.PI,
            };
            itemsRef.current = [...itemsRef.current.filter(it => it.id !== item.id), newItem];
            setItems(itemsRef.current);
          }, 3000);
        }
        return item;
      });

      const activeItems = nextItems.filter((item) => item.active);
      itemsRef.current = nextItems;
      setItems(activeItems);

      // Update particles
      const nextParticles = particlesRef.current
        .map((p) => {
          p.position[0] += p.velocity[0];
          p.position[1] += p.velocity[1];
          p.position[2] += p.velocity[2];
          p.life += 1;
          return p;
        })
        .filter((p) => p.life < p.maxLife);

      particlesRef.current = nextParticles;
      setParticles(nextParticles);

    }, 30);

    return () => {
      clearInterval(loop);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [isDead, activeAnim, isPunching, settings.difficulty, bindings, gamePhase, warpGate]);

  return (
    <div id="game-stage-container" className="relative w-full h-full flex flex-col bg-black text-white select-none overflow-hidden font-mono">
      
      {/* 3D Canvas Renders */}
      <div id="three-canvas-holder" className="absolute inset-0 w-full h-full z-0">
        <Canvas shadows camera={{ position: [0, 8, 11], fov: 50 }}>
          <Suspense fallback={null}>
            {/* Environment and Lights */}
            <ambientLight intensity={0.8} />
            <directionalLight 
               position={[15, 25, 10]} 
              intensity={1.5} 
              castShadow 
              shadow-mapSize-width={1024} 
              shadow-mapSize-height={1024} 
            />
            {/* Glowing neon follow point light */}
            <pointLight 
              position={[playerPos[0], 1.5, playerPos[2]]} 
              color={isPunching ? "#38bdf8" : "#ef4444"} 
              intensity={4} 
              distance={12} 
            />

            {/* Structured scene layers */}
            <Ground />
            <SpaceGrid />

            {/* Interactive player */}
            <PlayerSprite 
              position={playerPos} 
              facing={playerFacing.current} 
              animState={activeAnim} 
              frameIndex={frameIndex}
              isPunching={isPunching}
            />

            {/* Special expand Ring */}
            <SkillRing position={playerPos} radius={specialRingRadius} opacity={specialRingOpacity} />

            {/* Interactive Hitbox guide */}
            <HitboxVisual position={playerPos} active={isPunching} facing={playerFacing.current} />

            {/* Active Potion Items */}
            {items.map((item) => (
              <ItemSprite key={item.id} position={item.position} pulseY={item.pulseY} />
            ))}

            {/* Active Enemies */}
            {enemies.map((e) => (
              <EnemySprite 
                key={e.id} 
                position={e.position} 
                facing={e.facing} 
                animState={e.animState} 
                frameIndex={frameIndex}
                flashState={e.flashState}
              />
            ))}

            {/* Active Boss */}
            {boss && (
              <BossSprite 
                position={boss.position} 
                facing={boss.facing} 
                animState={boss.animState} 
                frameIndex={frameIndex}
                flashState={boss.flashState}
                scale={boss.scale}
              />
            )}

            {/* Active Fireballs */}
            {fireballs.map((fb) => (
              <FireballSprite 
                key={fb.id} 
                position={fb.position} 
                targetPos={fb.targetPos} 
                progress={fb.progress} 
              />
            ))}

            {/* Active Warp Gate Portal */}
            {warpGate && (
              <WarpGateSprite position={warpGate.position} />
            )}

            {/* NPC in Ending Scene */}
            {gamePhase === 'ENDING' && (
              <NPCSprite 
                position={npcPos} 
                facing={npcFacing} 
                animState={npcAnimState} 
                frameIndex={frameIndex}
              />
            )}

            {/* Particle explosions */}
            <ParticlesGroup particles={particles} />

            {/* Live active follow camera */}
            <CameraFollow playerPos={playerPos} />
          </Suspense>
        </Canvas>
      </div>

      {/* Viewport Scanlines Filter */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] pointer-events-none z-10" />

      {/* TOP HEADER HUD OVERLAY */}
      <div id="hud-top" className="absolute top-4 left-4 right-4 flex justify-between items-start z-20 pointer-events-none">
        
        {/* Lives & Score Counter Dashboard */}
        <div className="flex flex-col gap-2 p-4 bg-black/75 border border-red-900/40 rounded-sm backdrop-blur-md pointer-events-auto shadow-[0_0_15px_rgba(220,38,38,0.15)]">
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wide">พลังชีวิต:</span>
            <div className="flex gap-1.5">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div 
                  key={idx} 
                  className={`w-3 h-3 rotate-45 border ${
                    idx < playerHp 
                      ? 'bg-red-600 border-red-400 shadow-[0_0_5px_rgba(239,68,68,0.8)]' 
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wide">คะแนนสะสม:</span>
            <span className="text-xl font-bold text-red-500 tracking-wider">
              {String(score).padStart(6, '0')}
            </span>
          </div>
        </div>

        {/* Action Header Navigation Panel */}
        <div className="flex gap-2 pointer-events-auto">
          <button
            id="hud-settings-btn"
            onClick={() => { audio.playClick(); onOpenOptions(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/70 hover:bg-red-950/40 border border-red-800/40 hover:border-red-500 text-red-400 rounded-xs text-xs font-bold transition duration-200 uppercase tracking-widest cursor-pointer"
          >
            <Settings size={13} />
            ปรับแต่งปุ่ม
          </button>
          <button
            id="hud-home-btn"
            onClick={() => { audio.playClick(); onBackToMenu(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-black/70 hover:bg-zinc-800/40 border border-zinc-800 hover:border-zinc-500 text-zinc-300 rounded-xs text-xs font-bold transition duration-200 uppercase tracking-widest cursor-pointer"
          >
            <Home size={13} />
            หน้าหลัก
          </button>
        </div>

      </div>

      {/* QUICK INSTRUCTIONS BANNER */}
      <div id="quick-controls-hud" className="absolute left-4 bottom-24 bg-black/80 border border-red-900/30 p-3.5 rounded-sm max-w-xs z-10 space-y-2 pointer-events-none text-zinc-400 text-xs backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-1.5 border-b border-red-900/20 pb-1.5 font-bold uppercase text-red-400 text-[10px] tracking-wider">
          <Gamepad2 size={13} />
          <span>การบังคับตัวละคร (CONTROLS)</span>
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between items-center">
            <span>เดิน 8 ทิศทาง:</span>
            <span className="text-red-500 font-bold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">WASD / Arrow Keys</span>
          </div>
          <div className="flex justify-between items-center">
            <span>ต่อยโจมตี:</span>
            <span className="text-cyan-400 font-bold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">[{getFriendlyKeyName(bindings.attack)}]</span>
          </div>
          <div className="flex justify-between items-center">
            <span>ระเบิดพลังพิเศษ:</span>
            <span className="text-yellow-400 font-bold bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">[{getFriendlyKeyName(bindings.special)}]</span>
          </div>
        </div>
        <div className="text-[10px] text-zinc-500 border-t border-red-900/10 pt-1.5">
          * หยุดนิ่งๆ เกิน 4 วินาทีเพื่อเต้นแดนซ์ระบำ
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div id="hud-bottom" className="absolute bottom-4 left-4 right-4 flex flex-col md:flex-row justify-between items-center gap-4 z-20 pointer-events-none">
        
        {/* Dynamic State Diagnostics */}
        <div className="flex gap-4 p-2 bg-black/60 border border-zinc-900 px-4 py-2.5 rounded text-xs text-zinc-500 tracking-wider">
          <div>ANIM STATE: <span className="text-red-500 font-bold">{activeAnim}</span></div>
          <div>COORDINATES: <span className="text-zinc-300 font-mono">[{playerPos[0].toFixed(1)}, {playerPos[2].toFixed(1)}]</span></div>
          <div>ENEMIES: <span className="text-red-500 font-bold">{enemies.length}</span></div>
          <div>POTIONS: <span className="text-green-400 font-bold">{items.length}</span></div>
        </div>

        {/* Cooldown Special Bar */}
        <div className="w-full max-w-sm p-3.5 bg-black/75 border border-red-900/30 rounded-sm backdrop-blur-md pointer-events-auto flex flex-col gap-1.5 shadow-[0_0_15px_rgba(220,38,38,0.15)]">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Flame size={12} className={specialCharge >= 100 ? 'animate-bounce text-yellow-400' : ''} />
              พลังระเบิดวงแหวน ({getFriendlyKeyName(bindings.special)})
            </span>
            <span className={specialCharge >= 100 ? 'text-yellow-400 animate-pulse font-extrabold' : 'text-zinc-500'}>
              {specialCharge >= 100 ? 'พลังชาร์จเต็ม 100%!' : `กำลังชาร์จ... ${Math.round(specialCharge)}%`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-100 ${
                specialCharge >= 100 
                  ? 'bg-gradient-to-r from-red-600 via-yellow-500 to-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]' 
                  : 'bg-red-500'
              }`}
              style={{ width: `${specialCharge}%` }}
            />
          </div>
        </div>

      </div>

      {/* BOSS HP BAR HUD */}
      {boss && (
        <div id="boss-hp-bar" className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-md p-4 bg-black/85 border-2 border-red-950/60 rounded-xs backdrop-blur-md z-20 flex flex-col gap-1.5 shadow-[0_0_20px_rgba(239,68,68,0.25)] pointer-events-auto">
          <div className="flex justify-between items-center text-xs">
            <span className="text-red-500 font-extrabold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <span className="inline-block w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
              ⚠️ มังกรอสูรโบราณ (ANCIENT DEMON BOSS)
            </span>
            <span className="text-red-400 font-mono font-bold">
              {boss.hp} / {boss.maxHp} HP
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-950 border border-red-900 rounded-xs overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-800 via-red-500 to-amber-500 transition-all duration-300 shadow-[0_0_10px_rgba(220,38,38,0.7)]"
              style={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* GAME OVER SCREEN OVERLAY */}
      {isDead && (
        <div id="gameover-overlay" className="absolute inset-0 bg-black/90 z-30 flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md border-2 border-red-600 p-8 rounded-none bg-red-950/10 shadow-[0_0_35px_rgba(220,38,38,0.35)] backdrop-blur-md">
            <div className="space-y-2">
              <h2 className="text-red-500 text-4xl font-extrabold uppercase tracking-widest animate-pulse">
                ภารกิจสิ้นสุด
              </h2>
              <p className="text-zinc-400 text-xs">พลังชีวิตของคุณหมดลงแล้วในสนามจำลอง 3D</p>
            </div>

            <div className="bg-zinc-950 border border-red-950/40 p-4 rounded-xs inline-block min-w-[220px]">
              <span className="text-zinc-500 text-[10px] uppercase block mb-1">คะแนนที่คุณทำได้</span>
              <span className="text-2xl font-bold text-yellow-400">{score} แต้ม</span>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                id="gameover-retry-btn"
                onClick={handleResetGame}
                className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xs text-sm font-bold border border-red-500 transition shadow-[0_0_12px_rgba(239,68,68,0.4)] cursor-pointer uppercase tracking-wider"
              >
                <RotateCcw size={16} />
                ประลองอีกครั้ง
              </button>
              <button
                id="gameover-home-btn"
                onClick={() => { audio.playClick(); onBackToMenu(); }}
                className="flex items-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xs text-sm font-bold border border-zinc-700 transition cursor-pointer uppercase tracking-wider"
              >
                <Home size={16} />
                กลับเมนูหลัก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RPG DIALOGUE OVERLAY (ENDING SCENE) */}
      {gamePhase === 'ENDING' && (
        <div id="dialogue-overlay" className="absolute inset-0 bg-black/40 z-30 flex flex-col justify-end p-6 pointer-events-none">
          <div className="w-full max-w-3xl mx-auto p-5 bg-zinc-950/95 border-2 border-cyan-800 rounded-sm backdrop-blur-md flex flex-col gap-4 shadow-[0_0_30px_rgba(56,189,248,0.25)] pointer-events-auto">
            
            {/* Speakers Portraits section */}
            <div className="flex justify-between items-end h-20 px-4">
              
              {/* Player Portrait Left */}
              <div className={`flex items-center gap-3 transition-all duration-300 ${DIALOGUES[Math.min(endingDialogueIndex, DIALOGUES.length - 1)]?.side === 'left' ? 'opacity-100 scale-105' : 'opacity-40 scale-95'}`}>
                <div className="w-12 h-12 bg-zinc-900 border-2 border-red-500 rounded-full flex items-center justify-center overflow-hidden bg-[url('https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/character_vovq11.png')] bg-[length:192px_192px] bg-[position:-4px_-4px] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <div className="flex flex-col">
                  <span className="text-red-400 text-xs font-bold uppercase tracking-wide">อัศวินผู้พิทักษ์</span>
                  <span className="text-[10px] text-zinc-500 font-mono">PLAYER</span>
                </div>
              </div>

              {/* Speaker Indicator Center Bubble */}
              <div className="text-[10px] bg-cyan-950 border border-cyan-800 px-3 py-1 rounded-full text-cyan-400 font-bold uppercase tracking-widest animate-pulse">
                คุยกันชื่นชมความสำเร็จ
              </div>

              {/* NPC Portrait Right */}
              <div className={`flex items-center gap-3 flex-row-reverse transition-all duration-300 ${DIALOGUES[Math.min(endingDialogueIndex, DIALOGUES.length - 1)]?.side === 'right' ? 'opacity-100 scale-105' : 'opacity-40 scale-95'}`}>
                <div className="w-12 h-12 bg-zinc-900 border-2 border-cyan-400 rounded-full flex items-center justify-center overflow-hidden bg-[url('https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/npc1_pdraha.png')] bg-[length:192px_96px] bg-[position:-4px_-4px] shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                <div className="flex flex-col items-end">
                  <span className="text-cyan-400 text-xs font-bold uppercase tracking-wide">ผู้ชี้นำโบราณ</span>
                  <span className="text-[10px] text-zinc-500 font-mono">NPC</span>
                </div>
              </div>

            </div>

            {/* Dialog Text Box */}
            <div className="relative border border-zinc-800 bg-zinc-900/60 p-4 rounded-xs min-h-[90px] flex flex-col justify-between">
              
              {/* Speaker Name Tag */}
              <div className={`absolute -top-3 px-3 py-0.5 text-[10px] font-bold border rounded-sm tracking-wider uppercase ${
                DIALOGUES[Math.min(endingDialogueIndex, DIALOGUES.length - 1)]?.speaker === 'player'
                  ? 'bg-red-950 text-red-400 border-red-800'
                  : 'bg-cyan-950 text-cyan-400 border-cyan-800'
              }`}>
                {DIALOGUES[Math.min(endingDialogueIndex, DIALOGUES.length - 1)]?.name}
              </div>

              {/* Text Content */}
              <p className="text-sm text-zinc-100 leading-relaxed pt-2 font-sans select-text">
                "{DIALOGUES[Math.min(endingDialogueIndex, DIALOGUES.length - 1)]?.text}"
              </p>

              {/* Next and Action Buttons */}
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-zinc-800/60">
                <span className="text-[10px] text-zinc-500 font-mono">
                  บทสนทนา: {Math.min(endingDialogueIndex + 1, DIALOGUES.length)} / {DIALOGUES.length}
                </span>

                {endingDialogueIndex < DIALOGUES.length - 1 ? (
                  <button
                    onClick={() => {
                      audio.playClick();
                      setEndingDialogueIndex((prev) => prev + 1);
                    }}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 hover:border-cyan-500 rounded-xs text-xs font-bold transition cursor-pointer"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      audio.playSpecial();
                      setEndingDialogueIndex((prev) => prev + 1); // trigger finish popup!
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border border-emerald-400 rounded-xs text-xs font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.4)] transition cursor-pointer uppercase tracking-widest animate-bounce"
                  >
                    <span>เสร็จสิ้นภารกิจ (FINISH)</span>
                    <Sparkles size={13} />
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* FINISH/VICTORY ENDING POPUP */}
      {gamePhase === 'ENDING' && endingDialogueIndex >= DIALOGUES.length && (
        <div id="finish-victory-overlay" className="absolute inset-0 bg-black/95 z-45 flex flex-col items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-lg border-2 border-emerald-500 p-8 rounded-none bg-emerald-950/15 shadow-[0_0_40px_rgba(16,185,129,0.35)] backdrop-blur-md relative overflow-hidden pointer-events-auto">
            
            {/* Cyber retro decorative patterns */}
            <div className="absolute top-0 left-0 w-12 h-1 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-0 right-0 w-12 h-1 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-0 left-0 w-12 h-1 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-0 right-0 w-12 h-1 border-b-2 border-r-2 border-emerald-400" />

            <div className="space-y-3">
              <span className="text-xs bg-emerald-950 border border-emerald-800 px-3 py-1 rounded-full text-emerald-400 font-extrabold uppercase tracking-widest">
                🏆 บรรลุชัยชนะอย่างรุ่งโรจน์ (VICTORY)
              </span>
              <h2 className="text-emerald-400 text-4xl md:text-5xl font-black uppercase tracking-widest leading-none drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                FINISH GAME
              </h2>
              <p className="text-zinc-400 text-xs md:text-sm font-sans max-w-sm mx-auto">
                ขอแสดงความยินดี! คุณปราบภัยพิบัติมังกรอสูรโบราณ และได้รับการยกย่องสรรเสริญสรรพคุณจากชนเผ่าโบราณ คืนความสงบสุขนิรันดร์ให้แก่มิติแห่งนี้
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-zinc-950/80 border border-zinc-900 p-4 rounded-xs">
              <div className="text-center border-r border-zinc-900 col-span-2 py-2">
                <span className="text-zinc-500 text-[10px] uppercase block mb-1">ผลคะแนนรวมสุดท้าย</span>
                <span className="text-3xl font-black text-yellow-400 tracking-wider">{score} แต้ม</span>
              </div>
            </div>

            <div className="flex gap-4 justify-center pt-2">
              <button
                id="finish-retry-btn"
                onClick={handleResetGame}
                className="flex items-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xs text-sm font-bold border border-zinc-700 transition cursor-pointer uppercase tracking-wider"
              >
                <RotateCcw size={16} />
                เล่นใหม่อีกครั้ง
              </button>
              <button
                id="finish-home-btn"
                onClick={() => { audio.playClick(); onBackToMenu(); }}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xs text-sm font-bold border border-emerald-500 shadow-[0_0_15px_rgba(52,211,153,0.45)] transition cursor-pointer uppercase tracking-widest"
              >
                <Home size={16} />
                กลับเมนูหลัก (TITLE)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
