import { Entity } from './Entity';
import { Player } from './Player';
import { CharacterType, Vector3D } from '../types';
import { sound } from '../system/Sound';
import { particles } from '../system/Particle';

export class Enemy extends Entity {
  target: Player | null = null;
  aiTimer: number = 0;
  aiState: 'patrol' | 'chase' | 'approach' | 'attack' = 'chase';
  
  speedX: number = 2.0;
  speedY: number = 1.0;
  
  attackCooldown: number = 0;
  attackInterval: number = 70 + Math.random() * 60; // Frames between attacks
  attackReachX: number = 65;
  attackReachY: number = 18;

  // Boss specific stats
  bossPhase: number = 1;
  bossStateTimer: number = 0;
  bossSkillCooldown: number = 0;

  constructor(type: CharacterType, x: number, y: number) {
    super(type, x, y);
    this.setupEnemyStats();
  }

  private setupEnemyStats() {
    if (this.type === 'manager') {
      this.color = '#ef4444'; // Red-orange manager
      this.hp = 35;
      this.maxHp = 35;
      this.speedX = 1.6 + Math.random() * 0.6;
      this.speedY = 0.8 + Math.random() * 0.4;
      this.attackReachX = 55;
      this.attackReachY = 15;
    } else if (this.type === 'zoom_zombie') {
      this.color = '#10b981'; // Greenish zombie zoom worker
      this.hp = 25;
      this.maxHp = 25;
      this.speedX = 1.2 + Math.random() * 0.4;
      this.speedY = 0.6 + Math.random() * 0.3;
      this.attackReachX = 45;
      this.attackReachY = 12;
      this.attackInterval = 50 + Math.random() * 50;
    } else if (this.type === 'boss') {
      this.color = '#ec4899'; // Large neon boss coffee machine
      this.hp = 250;
      this.maxHp = 250;
      this.width = 75;
      this.height = 110;
      this.depth = 35;
      this.speedX = 1.5;
      this.speedY = 0.8;
      this.attackReachX = 90;
      this.attackReachY = 30;
      this.attackInterval = 120;
    }
  }

  update() {
    super.update();

    if (this.state === 'die') {
      // Fade/sink into floor
      return;
    }

    if (this.hitstunTimer > 0) return;

    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.bossSkillCooldown > 0) this.bossSkillCooldown--;

    if (!this.target || this.target.state === 'die') {
      this.state = 'idle';
      this.vel.x = 0;
      this.vel.y = 0;
      return;
    }

    // AI logic ticks every frame
    this.aiTimer++;

    // Core AI Chase Loop
    const diffX = this.target.pos.x - this.pos.x;
    const diffY = this.target.pos.y - this.pos.y;
    const dist = Math.sqrt(diffX * diffX + diffY * diffY);

    if (this.type === 'boss') {
      this.updateBossAI(diffX, diffY, dist);
    } else {
      this.updateStandardEnemyAI(diffX, diffY);
    }

    // Apply movement physics on floor
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    // Boundary containment
    if (this.pos.x < 40) this.pos.x = 40;
    if (this.pos.x > 920) this.pos.x = 920;
    if (this.pos.y < 220) this.pos.y = 220;
    if (this.pos.y > 500) this.pos.y = 500;
  }

  private updateStandardEnemyAI(diffX: number, diffY: number) {
    const isAttacking = this.state.startsWith('attack');

    if (isAttacking) {
      this.vel.x *= 0.5;
      this.vel.y *= 0.5;
      
      // Let attack finish
      if (this.animFrame >= 3) {
        this.state = 'idle';
        this.animFrame = 0;
      }
      return;
    }

    // Target is facing player
    this.facing = diffX > 0 ? 1 : -1;

    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    if (absX < this.attackReachX && absY < this.attackReachY && this.attackCooldown <= 0) {
      // Strike!
      this.triggerAttack();
    } else {
      // Chase player
      this.state = 'walk';
      
      // Separate/offset enemies slightly vertically to prevent single-file lines
      const verticalOffset = Math.sin(this.id.charCodeAt(0) + Date.now() * 0.005) * 20;
      const targetY = this.target!.pos.y + verticalOffset;
      const finalDiffY = targetY - this.pos.y;

      this.vel.x = Math.sign(diffX) * this.speedX;
      this.vel.y = Math.sign(finalDiffY) * this.speedY;
    }
  }

  private updateBossAI(diffX: number, diffY: number, dist: number) {
    const isAttacking = this.state.startsWith('attack');
    if (isAttacking) {
      this.vel.x *= 0.8;
      this.vel.y *= 0.8;
      if (this.animFrame >= 4) {
        this.state = 'idle';
        this.animFrame = 0;
      }
      return;
    }

    this.bossStateTimer++;
    this.facing = diffX > 0 ? 1 : -1;

    // Special Boss state cycle
    // State 1: Espresso projectile spit (ranged)
    if (this.bossSkillCooldown <= 0 && dist > 180 && dist < 400 && Math.random() < 0.02) {
      this.triggerBossEspressoSpit();
    }
    // State 2: Steam charge tackle (melee charge)
    else if (this.bossSkillCooldown <= 0 && dist > 250 && Math.random() < 0.015) {
      this.triggerBossSteamCharge(diffX);
    }
    // State 3: Close combat slam
    else if (Math.abs(diffX) < this.attackReachX && Math.abs(diffY) < this.attackReachY && this.attackCooldown <= 0) {
      this.triggerAttack();
    }
    // State 4: Standard follow
    else {
      this.state = 'walk';
      this.vel.x = Math.sign(diffX) * this.speedX;
      this.vel.y = Math.sign(diffY) * this.speedY;
    }
  }

  private triggerAttack() {
    this.state = 'attack1';
    this.animFrame = 0;
    this.attackCooldown = this.attackInterval;
    sound.playSlash();
  }

  private triggerBossEspressoSpit() {
    this.state = 'attack2'; // projectile stance
    this.animFrame = 0;
    this.bossSkillCooldown = 180; // 3 seconds
    this.vel.x = 0;
    this.vel.y = 0;

    sound.playSlash();
    particles.createDamageText(this.pos.x, this.pos.y, this.pos.z + 80, 'ESPRESSO SHOT!', '#f43f5e');

    // Fire 3 burning espresso pools forwards
    setTimeout(() => {
      if (this.state === 'die') return;
      particles.createCoffeeSpill(this.pos.x + this.facing * 100, this.pos.y, 0, 15);
      particles.createCoffeeSpill(this.pos.x + this.facing * 180, this.pos.y, 0, 15);
      particles.createCoffeeSpill(this.pos.x + this.facing * 260, this.pos.y, 0, 15);
    }, 300);
  }

  private triggerBossSteamCharge(diffX: number) {
    this.state = 'attack3'; // Charge stance
    this.animFrame = 0;
    this.bossSkillCooldown = 300; // 5 seconds
    
    // Steam particles
    particles.createSparks(this.pos.x, this.pos.y, 50, '#ffffff', 20);
    particles.createDamageText(this.pos.x, this.pos.y, this.pos.z + 80, 'STEAM CHARGE!', '#67e8f9');

    // Dash heavy
    this.vel.x = Math.sign(diffX) * 12;
    this.vel.y = 0;

    sound.playExplosion();
  }

  // Draw customized procedural sprites for enemies
  protected drawProceduralCharacter(ctx: CanvasRenderingContext2D) {
    const isAttacking = this.state.startsWith('attack');
    const walkCycle = Math.sin(this.animFrame * 0.4);

    if (this.type === 'manager') {
      // --- THE MICRO-MANAGER ---
      // Dress Shirt & Strict Red Tie
      ctx.fillStyle = '#f8fafc'; // White shirt
      ctx.fillRect(-10, -45, 20, 32);
      ctx.fillStyle = '#dc2626'; // Red tie
      ctx.fillRect(-1.5, -45, 3, 16);

      // Pants & Belt
      ctx.fillStyle = '#1e293b'; // Slate pants
      ctx.fillRect(-10, -14, 20, 15);
      ctx.fillStyle = '#0f172a'; // Belt
      ctx.fillRect(-10.5, -15, 21, 2);

      // Head with angry glasses
      ctx.fillStyle = '#ffdbac';
      ctx.fillRect(-8, -61, 16, 16);
      ctx.fillStyle = '#ff003c'; // Red angry frames
      ctx.fillRect(-5, -53, 4, 2);
      ctx.fillRect(1, -53, 4, 2);
      ctx.fillStyle = '#78350f'; // Bald top with brown hair ring
      ctx.fillRect(-9, -62, 18, 2);

      // Swings Clip-Board weapon during attacks
      if (isAttacking) {
        ctx.save();
        ctx.translate(6, -26);
        ctx.rotate(-Math.PI / 4 + (this.animFrame * 0.3));
        ctx.fillStyle = '#854d0e'; // Wooden board
        ctx.fillRect(0, -12, 14, 24);
        ctx.fillStyle = '#94a3b8'; // Metal clip
        ctx.fillRect(2, -14, 10, 4);
        ctx.restore();
      } else {
        // Carry clipboard under arm
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(7, -35, 5, 16);
      }
    } else if (this.type === 'zoom_zombie') {
      // --- THE ZOOM ZOMBIE ---
      // Glitchy green skin
      ctx.fillStyle = '#10b981'; 
      ctx.fillRect(-10, -45, 20, 32); // Body

      ctx.fillStyle = '#d1fae5'; // Pale zombie face
      ctx.fillRect(-8, -61, 16, 16);

      // Blank white glowing virtual screen eyes
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(-6, -53, 4, 3);
      ctx.fillRect(2, -53, 4, 3);

      // Tattered office clothing
      ctx.fillStyle = '#475569';
      ctx.fillRect(-9, -14, 18, 15); // Pants

      // Zombie floppy walking arms
      if (isAttacking) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(0, -38, 20, 5); // Arms pointing forward
      } else {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(6, -38, 6, 14 + walkCycle * 2);
        ctx.fillRect(-12, -38, 6, 14 - walkCycle * 2);
      }
    } else if (this.type === 'boss') {
      // --- THE COFFEE MACHINE BEAST (BOSS) ---
      // Render big metal body
      ctx.fillStyle = '#475569'; // Slate metal body
      ctx.fillRect(-35, -95, 70, 80);

      ctx.fillStyle = '#1e293b'; // Dark front screen bezel
      ctx.fillRect(-28, -88, 56, 42);

      // Glowing digital neon boss eyes
      ctx.fillStyle = '#ff0055';
      ctx.font = 'bold 10px "Press Start 2P"';
      ctx.fillText('CRITICAL', -30, -68);

      // Coffee dispenser details
      ctx.fillStyle = '#1e1b4b'; // cup tray
      ctx.fillRect(-20, -42, 40, 6);
      ctx.fillStyle = '#00ffff'; // steam vent nozzle
      ctx.fillRect(-4, -48, 8, 6);

      // Steam coming out
      if (Math.random() < 0.25) {
        particles.addParticle({
          x: this.pos.x + (Math.random() * 20 - 10),
          y: this.pos.y,
          z: this.pos.z + 55,
          vx: (Math.random() * 2 - 1) * 0.5,
          vy: -0.2,
          vz: 1 + Math.random() * 2,
          color: '#ffffff', size: 3 + Math.random() * 4, life: 0, maxLife: 20,
          type: 'spark', gravity: -0.05
        });
      }

      // Giant mechanical robot legs
      ctx.fillStyle = '#0f172a';
      let leftLegY = -15 + (this.state === 'walk' ? walkCycle * 8 : 0);
      let rightLegY = -15 - (this.state === 'walk' ? walkCycle * 8 : 0);
      ctx.fillRect(-22, -15, 12, 16 + leftLegY);
      ctx.fillRect(10, -15, 12, 16 + rightLegY);
    }
  }
}
export interface TreatConfig {
  pos: Vector3D;
  size: number;
  life: number;
  maxLife: number;
}
