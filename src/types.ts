export interface Vector3D {
  x: number; // Position on floor horizontally
  y: number; // Depth position on floor (up/down lane)
  z: number; // Height above the floor (jumping)
}

export type CharacterType = 'consultant' | 'deployment_engineer' | 'support' | 'manager' | 'zoom_zombie' | 'boss';

export type CharacterState = 
  | 'idle' 
  | 'walk' 
  | 'attack1' 
  | 'attack2' 
  | 'attack3' 
  | 'jump' 
  | 'hit' 
  | 'die';

export interface Box3D {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export interface AttackConfig {
  name: string;
  damage: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxDepth: number;
  offsetY: number; // Offset relative to player center
  offsetZ: number; // Height offset relative to player
  knockbackX: number;
  knockbackY: number;
  knockbackZ: number;
  hitstun: number; // Frames of hitstun
  energyRecover?: number;
}

export interface ParticleConfig {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  gravity?: number;
  type?: 'spark' | 'coffee' | 'paper' | 'text' | 'dust';
  text?: string;
  textColor?: string;
}

export interface GameStats {
  score: number;
  wave: number;
  enemiesDefeated: number;
}
