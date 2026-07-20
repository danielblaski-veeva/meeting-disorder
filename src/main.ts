import { Entity } from './entities/Entity';
import { Player } from './entities/Player';
import { Enemy } from './entities/Enemy';
import { input } from './input';
import { sound } from './system/Sound';
import { particles } from './system/Particle';
import { collisions } from './system/Collision';
import { hud } from './ui/HUD';
import { GameStats, CharacterType } from './types';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  uiOverlay: HTMLDivElement;

  gameState: 'menu' | 'character_select' | 'playing' | 'gameover' | 'victory' = 'menu';
  selectedClass: 'consultant' | 'deployment_engineer' | 'support' = 'consultant';

  player: Player | null = null;
  enemies: Enemy[] = [];
  
  // Game stats
  stats: GameStats = {
    score: 0,
    wave: 1,
    enemiesDefeated: 0
  };

  // Camera scroll position
  cameraX: number = 0;
  targetCameraX: number = 0;
  screenShake: number = 0;

  // Level & Wave Spawning
  waveProgress: number = 0;
  isArenaLocked: boolean = false;
  arenaLockX: number = 0;
  waveCooldown: number = 0;

  // Combo mechanics
  comboCount: number = 0;
  comboResetTimer: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.uiOverlay = document.getElementById('uiOverlay') as HTMLDivElement;

    // Start gameloop
    requestAnimationFrame((t) => this.loop(t));

    // Show initial start menu
    this.showMenu();
  }

  private loop(_timestamp: number) {
    this.update();
    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }

  // --- GAME UPDATES ---
  private update() {
    input.update();

    if (this.screenShake > 0) {
      this.screenShake *= 0.9;
      if (this.screenShake < 0.2) this.screenShake = 0;
    }

    if (this.gameState !== 'playing') return;

    if (this.player) {
      this.player.update();
      if (this.player.state === 'die') {
        setTimeout(() => this.triggerGameOver(), 1500);
      }
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update();

      if (enemy.state === 'die') {
        // Drop treats (Coffee cups) for health recovery
        if (Math.random() < 0.4) {
          particles.createDamageText(enemy.pos.x, enemy.pos.y, enemy.pos.z + 10, '☕ +15 COFFEE', '#fbbf24');
          if (this.player) this.player.addCoffee(15);
        }
        
        this.enemies.splice(i, 1);
        this.stats.enemiesDefeated--;
        this.stats.score += enemy.type === 'boss' ? 1000 : enemy.type === 'manager' ? 150 : 100;
        
        // Screenshake on death
        this.screenShake = enemy.type === 'boss' ? 20 : 6;
      }
    }

    // Manage Wave Spawning
    this.updateSpawner();

    // Check physics / pushback collisions between active characters
    const allCharacters: Entity[] = [...this.enemies];
    if (this.player && this.player.state !== 'die') allCharacters.push(this.player);

    for (let i = 0; i < allCharacters.length; i++) {
      for (let j = i + 1; j < allCharacters.length; j++) {
        collisions.resolvePushing(allCharacters[i], allCharacters[j]);
      }
    }

    // Check Combat Hitboxes (Attacks!)
    this.checkCombatHits();

    // Update Particles
    particles.update();
    hud.update();

    // Update Camera
    if (this.player) {
      if (this.isArenaLocked) {
        // Constrain player within lock arena bounds
        const minX = this.arenaLockX - 450;
        const maxX = this.arenaLockX + 450;
        if (this.player.pos.x < minX) this.player.pos.x = minX;
        if (this.player.pos.x > maxX) this.player.pos.x = maxX;

        this.targetCameraX = this.arenaLockX - this.canvas.width / 2;
      } else {
        // Soft lock tracking
        this.targetCameraX = this.player.pos.x - this.canvas.width / 2;
      }

      // Keep camera inside level boundary limit
      if (this.targetCameraX < 0) this.targetCameraX = 0;
      if (this.targetCameraX > 2500) this.targetCameraX = 2500; // max level width 3460

      // Smooth camera interpolation
      this.cameraX += (this.targetCameraX - this.cameraX) * 0.1;
    }

    // Combo reset check
    if (this.comboResetTimer > 0) {
      this.comboResetTimer--;
      if (this.comboResetTimer <= 0) {
        this.comboCount = 0;
      }
    }
  }

  private checkCombatHits() {
    if (!this.player || this.player.state === 'die') return;

    // 1. Check Player attacks connecting on enemies
    if (this.player.state.startsWith('attack') && this.player.currentAttack && !this.player.hasHitThisAttack) {
      const attack = this.player.currentAttack;
      let hitAny = false;

      this.enemies.forEach((enemy) => {
        if (enemy.state !== 'die' && collisions.checkAttackConnects(this.player!, enemy, attack)) {
          // Calculate knockback velocity
          const kForceX = this.player!.facing * attack.knockbackX;
          const kForceY = (Math.random() * 2 - 1) * attack.knockbackY;
          
          const hitSuccess = enemy.takeDamage(
            attack.damage,
            { x: kForceX, y: kForceY, z: attack.knockbackZ },
            attack.hitstun
          );

          if (hitSuccess) {
            hitAny = true;
            this.screenShake = attack.knockbackZ > 3 ? 12 : 5;
            
            // Add particles
            particles.createSparks(enemy.pos.x, enemy.pos.y, enemy.pos.z + 20, this.player!.color, 8);
            particles.createCoffeeSpill(enemy.pos.x, enemy.pos.y, enemy.pos.z + 10, 4);
            particles.createDamageText(enemy.pos.x, enemy.pos.y, enemy.pos.z + 40, `-${attack.damage} HP`, '#ffffff');

            // Recover Player coffee meter
            if (attack.energyRecover) {
              this.player!.addCoffee(attack.energyRecover);
            }

            // Hitstop frame freeze
            sound.playHit();
            
            // Combo increment
            this.comboCount++;
            this.comboResetTimer = 120; // 2 seconds
            hud.triggerCombo(this.comboCount);
          }
        }
      });

      if (hitAny) {
        this.player.hasHitThisAttack = true;
      }
    }

    // 2. Check Enemies attacks connecting on player
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'attack1' && enemy.animFrame === 1 && !enemy.isInvulnerable) {
        const attackName = enemy.type === 'boss' ? 'Slam' : 'Clipboard Slap';
        const damage = enemy.type === 'boss' ? 25 : enemy.type === 'manager' ? 12 : 8;
        const kX = enemy.facing * (enemy.type === 'boss' ? 10 : 4);
        const kZ = enemy.type === 'boss' ? 5 : 2;

        const fakeConfig = {
          name: attackName, damage, hitboxWidth: enemy.attackReachX, hitboxHeight: 50, hitboxDepth: enemy.attackReachY * 2,
          offsetY: 0, offsetZ: 20, knockbackX: kX, knockbackY: 0, knockbackZ: kZ, hitstun: 20
        };

        if (collisions.checkAttackConnects(enemy, this.player!, fakeConfig)) {
          const hitSuccess = this.player!.takeDamage(
            damage,
            { x: kX, y: 0, z: kZ },
            20
          );

          if (hitSuccess) {
            this.screenShake = 14;
            particles.createSparks(this.player!.pos.x, this.player!.pos.y, this.player!.pos.z + 25, '#f43f5e', 12);
            particles.createDamageText(this.player!.pos.x, this.player!.pos.y, this.player!.pos.z + 45, `-${damage} HP`, '#dc2626');
            sound.playHit();

            // Reset combo
            this.comboCount = 0;
          }
        }
      }
    });
  }

  private updateSpawner() {
    if (this.enemies.length === 0 && this.stats.enemiesDefeated === 0) {
      if (this.isArenaLocked) {
        this.isArenaLocked = false; // Wave cleared, unlocking
        sound.playPowerUp();
        particles.createDamageText(this.player!.pos.x, this.player!.pos.y, 50, 'ARENA CLEAR! MOVE RIGHT →', '#00f0ff');
      }

      if (this.waveCooldown > 0) {
        this.waveCooldown--;
        return;
      }

      // Advance wave or trigger victory
      if (this.waveProgress > 0) {
        this.stats.wave++;
        this.waveProgress = 0;
      }

      const playerX = this.player ? this.player.pos.x : 0;

      // Wave Spawning Triggers based on Player's position
      if (this.stats.wave === 1 && playerX > 500 && this.waveProgress === 0) {
        this.spawnWave([
          { type: 'zoom_zombie', x: playerX + 350, y: 280 },
          { type: 'zoom_zombie', x: playerX + 380, y: 440 },
          { type: 'manager', x: playerX + 420, y: 350 }
        ], playerX + 200);
      } 
      else if (this.stats.wave === 2 && playerX > 1200 && this.waveProgress === 0) {
        this.spawnWave([
          { type: 'manager', x: playerX + 350, y: 260 },
          { type: 'zoom_zombie', x: playerX + 380, y: 340 },
          { type: 'zoom_zombie', x: playerX + 320, y: 460 },
          { type: 'manager', x: playerX + 450, y: 400 }
        ], playerX + 200);
      } 
      else if (this.stats.wave === 3 && playerX > 2000 && this.waveProgress === 0) {
        // Trigger Boss Battle!
        this.spawnWave([
          { type: 'boss', x: playerX + 400, y: 350 },
          { type: 'zoom_zombie', x: playerX + 350, y: 250 },
          { type: 'zoom_zombie', x: playerX + 450, y: 450 }
        ], playerX + 200);
      }
      else if (this.stats.wave >= 3 && playerX > 2300 && this.enemies.length === 0) {
        // All Waves beaten!
        this.triggerVictory();
      }
    }
  }

  private spawnWave(enemyList: { type: string; x: number; y: number }[], lockX: number) {
    this.isArenaLocked = true;
    this.arenaLockX = lockX;
    this.waveProgress = 1;

    enemyList.forEach((spec) => {
      const enemy = new Enemy(spec.type as CharacterType, spec.x, spec.y);
      enemy.target = this.player;
      this.enemies.push(enemy);
    });

    this.stats.enemiesDefeated = this.enemies.length;
    sound.playPowerUp();
    particles.createDamageText(lockX, 350, 80, 'WARNING: SYSTEM ANOMALY!', '#f43f5e');
  }

  // --- GAME RENDERING ---
  private draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Camera translation and screen shake juice
    this.ctx.save();
    
    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() * 2 - 1) * this.screenShake;
      shakeY = (Math.random() * 2 - 1) * this.screenShake;
    }

    this.ctx.translate(-Math.floor(this.cameraX) + shakeX, shakeY);

    // 1. Draw Office Level Environment (Floor, Parallax walls, assets)
    this.drawOfficeLevel();

    // 2. Draw 2.5D Depth Sorted Shadows & Characters
    const renderList: (Player | Enemy)[] = [...this.enemies];
    if (this.player) renderList.push(this.player);

    // Sort by y axis so entities closer to foreground render in front!
    renderList.sort((a, b) => a.pos.y - b.pos.y);

    // Draw Shadows first
    renderList.forEach(entity => entity.drawShadow(this.ctx));

    // Draw Entities
    renderList.forEach(entity => {
      entity.draw(this.ctx);
      
      // Draw Hitbox debug frames if enabled
      if (entity instanceof Player && entity.state.startsWith('attack') && entity.currentAttack) {
        collisions.drawAttackHitbox(this.ctx, entity, entity.currentAttack);
      }
    });

    // 3. Draw Particles (Sparks, blood/coffee pools, pop-up texts)
    particles.draw(this.ctx);

    // Restore camera translation
    this.ctx.restore();

    // 4. Draw static UI Heads-up Display
    if (this.gameState === 'playing' && this.player) {
      // Find active boss
      const boss = this.enemies.find(e => e.type === 'boss') || null;
      hud.draw(this.ctx, this.player, this.stats, boss);
    }
  }

  private drawOfficeLevel() {
    const levelWidth = 3460;

    // Draw Floor grid (Tiles)
    this.ctx.fillStyle = '#0f111e'; // Dark floor tint
    this.ctx.fillRect(0, 220, levelWidth, 320);

    // Render floor lanes (perspective grids)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    this.ctx.lineWidth = 1;
    for (let laneY = 220; laneY <= 500; laneY += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, laneY);
      this.ctx.lineTo(levelWidth, laneY);
      this.ctx.stroke();
    }

    // Parallax scrolling office windows/cubicles in background (renders above y = 220)
    const parallaxScroll = this.cameraX * 0.45;
    this.ctx.save();
    this.ctx.translate(parallaxScroll, 0);

    // Draw deep background skyscrapers outside windows
    this.ctx.fillStyle = '#07080f';
    this.ctx.fillRect(0, 0, levelWidth, 220);

    // Office cubicle separators / background servers
    for (let i = 0; i < levelWidth; i += 280) {
      // Large windows showing neon skyscraper silhouettes
      this.ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
      this.ctx.fillRect(i + 20, 30, 100, 140);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      this.ctx.strokeRect(i + 20, 30, 100, 140);

      // Skyscraper structures
      this.ctx.fillStyle = '#111221';
      this.ctx.fillRect(i + 35, 90, 30, 80);
      this.ctx.fillRect(i + 70, 70, 25, 100);

      // Office wall plants
      ctxCircle(this.ctx, i + 200, 170, 15, '#10b981');
      this.ctx.fillStyle = '#3f3f46'; // Flowerpot
      this.ctx.fillRect(i + 194, 185, 12, 18);
    }
    this.ctx.restore();

    // Foreground static/destructible office barriers (Desks, Swivel chairs, Water Coolers)
    // Players and enemies walk around them
    for (let i = 400; i < levelWidth; i += 650) {
      // Draw standard office desk obstacle
      this.ctx.fillStyle = '#1e293b'; // desk body
      this.ctx.fillRect(i, 205, 75, 25);
      this.ctx.fillStyle = '#3b82f6'; // neon blue desktop computer screen
      this.ctx.fillRect(i + 25, 185, 25, 16);
      this.ctx.fillStyle = '#0f172a'; // computer stand
      this.ctx.fillRect(i + 35, 201, 5, 4);
    }

    // Arena Lock glowing barriers (Locks screen when waves are active)
    if (this.isArenaLocked) {
      const barrierX1 = this.arenaLockX - 480;
      const barrierX2 = this.arenaLockX + 480;

      // Draw red hazard warning line barriers
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([8, 8]);

      // Left Barrier
      this.ctx.fillRect(barrierX1 - 10, 220, 20, 280);
      this.ctx.beginPath();
      this.ctx.moveTo(barrierX1, 220);
      this.ctx.lineTo(barrierX1, 500);
      this.ctx.stroke();

      // Right Barrier
      this.ctx.fillRect(barrierX2 - 10, 220, 20, 280);
      this.ctx.beginPath();
      this.ctx.moveTo(barrierX2, 220);
      this.ctx.lineTo(barrierX2, 500);
      this.ctx.stroke();

      this.ctx.restore();
    }
  }

  // --- STATE TRANSITIONS & UI ---
  showMenu() {
    this.gameState = 'menu';
    this.uiOverlay.style.opacity = '1';
    this.uiOverlay.style.pointerEvents = 'auto';

    this.uiOverlay.innerHTML = `
      <div class="menu-panel">
        <h1 class="menu-title">MEETING DISORDER</h1>
        <p class="menu-desc">Collaborate as Team Alpha. Defeat Zoom Zombies, bypass rogue Micromanagers, and survive the coffee machine's ultimate scope creep in this action-packed 2.5D Beat-Em-Up!</p>
        <button class="btn-primary" id="btnStartSelect">SELECT CHARACTER</button>
      </div>
    `;

    document.getElementById('btnStartSelect')!.addEventListener('click', () => {
      sound.playPowerUp();
      this.showCharacterSelect();
    });
  }

  showCharacterSelect() {
    this.gameState = 'character_select';

    this.uiOverlay.innerHTML = `
      <div class="menu-panel" style="max-width: 800px;">
        <h1 class="menu-title">SELECT CORPORATE FIGHTER</h1>
        <div class="character-select-grid">
          <!-- Consultant -->
          <div class="char-card selected" data-class="consultant">
            <div class="char-avatar-container" style="font-size: 2.5rem; margin-bottom: 0.8rem;">💼</div>
            <div class="char-name">THE CONSULTANT</div>
            <div class="char-stats">
              <div class="stat-bar-container"><span class="stat-label">HP</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 65%;"></div></div></div>
              <div class="stat-bar-container"><span class="stat-label">ATK</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 75%;"></div></div></div>
              <div class="stat-bar-container"><span class="stat-label">SPD</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 100%;"></div></div></div>
            </div>
            <div class="char-desc" style="font-size: 10px; color: #94a3b8; margin-top: 10px; line-height: 1.4; text-align: left;">
              <strong>Archetype:</strong> Agile / Ranged<br/>
              <strong>Weapon:</strong> Laser Pointer & Slides<br/>
              <em>Fast & Evasive.</em> Can dash rapidly in and out of close combat, peppering foes with buzzwords.
            </div>
          </div>
          <!-- Deployment Engineer -->
          <div class="char-card" data-class="deployment_engineer">
            <div class="char-avatar-container" style="font-size: 2.5rem; margin-bottom: 0.8rem;">⚙️</div>
            <div class="char-name">DEPLOYMENT ENG</div>
            <div class="char-stats">
              <div class="stat-bar-container"><span class="stat-label">HP</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 100%;"></div></div></div>
              <div class="stat-bar-container"><span class="stat-label">ATK</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 95%;"></div></div></div>
              <div class="stat-bar-container"><span class="stat-label">SPD</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 50%;"></div></div></div>
            </div>
            <div class="char-desc" style="font-size: 10px; color: #94a3b8; margin-top: 10px; line-height: 1.4; text-align: left;">
              <strong>Archetype:</strong> Heavy / Bruiser<br/>
              <strong>Weapon:</strong> CAT6 Whip & Server Blade<br/>
              <em>Slow & Heavy.</em> High HP, slow movement. Wide sweeps that hit groups of enemies. Excellent CC.
            </div>
          </div>
          <!-- Support -->
          <div class="char-card" data-class="support">
            <div class="char-avatar-container" style="font-size: 2.5rem; margin-bottom: 0.8rem;">📞</div>
            <div class="char-name">THE SUPPORT</div>
            <div class="char-stats">
              <div class="stat-bar-container"><span class="stat-label">HP</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 80%;"></div></div></div>
              <div class="stat-bar-container"><span class="stat-label">ATK</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 80%;"></div></div></div>
              <div class="stat-bar-container"><span class="stat-label">SPD</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width: 75%;"></div></div></div>
            </div>
            <div class="char-desc" style="font-size: 10px; color: #94a3b8; margin-top: 10px; line-height: 1.4; text-align: left;">
              <strong>Archetype:</strong> Brawler / Tank<br/>
              <strong>Weapon:</strong> Ringing Desk Phones<br/>
              <em>Balanced.</em> Frontline brawler who takes customer anger. Excellent close-quarters ringing combos.
            </div>
          </div>
        </div>
        <button class="btn-primary" id="btnLaunchGame" style="width: 100%;">LOG IN & START WORKING</button>
      </div>
    `;

    // Interactivity to select card
    const cards = document.querySelectorAll('.char-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedClass = card.getAttribute('data-class') as 'consultant' | 'deployment_engineer' | 'support';
        sound.playSlash();
      });
    });

    document.getElementById('btnLaunchGame')!.addEventListener('click', () => {
      this.startGame();
    });
  }

  startGame() {
    this.gameState = 'playing';
    this.uiOverlay.style.opacity = '0';
    this.uiOverlay.style.pointerEvents = 'none';

    // Reset values
    this.enemies = [];
    this.cameraX = 0;
    this.stats = { score: 0, wave: 1, enemiesDefeated: 0 };
    this.isArenaLocked = false;
    this.waveProgress = 0;
    this.waveCooldown = 0;
    this.comboCount = 0;

    // Instantiate selected fighter player
    this.player = new Player(this.selectedClass, 150, 350);

    // Audio & chiptune trigger
    sound.startBGM();
    particles.createDamageText(150, 350, 60, 'WORKDAY STARTED!', this.player.color);
  }

  triggerGameOver() {
    this.gameState = 'gameover';
    sound.stopBGM();
    sound.playExplosion();

    this.uiOverlay.style.opacity = '1';
    this.uiOverlay.style.pointerEvents = 'auto';

    this.uiOverlay.innerHTML = `
      <div class="menu-panel">
        <h1 class="menu-title" style="color: #ef4444; text-shadow: 0 0 10px rgba(239, 68, 68, 0.4);">PERFORMANCE PIP</h1>
        <p class="menu-desc">You've been put on a Performance Improvement Plan (PIP)! The micromanagers overwhelmed your capacity. Total Score: <strong style="color: white">${this.stats.score}</strong>.</p>
        <button class="btn-primary" id="btnRestart">RETRY PROBATION</button>
      </div>
    `;

    document.getElementById('btnRestart')!.addEventListener('click', () => {
      sound.playPowerUp();
      this.showCharacterSelect();
    });
  }

  triggerVictory() {
    this.gameState = 'victory';
    sound.stopBGM();
    sound.playPowerUp();

    this.uiOverlay.style.opacity = '1';
    this.uiOverlay.style.pointerEvents = 'auto';

    this.uiOverlay.innerHTML = `
      <div class="menu-panel">
        <h1 class="menu-title" style="color: #10b981; text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);">PROMOTED TO VP!</h1>
        <p class="menu-desc">Incredible work! You successfully resolved the "Meeting Disorder" and saved Team Alpha's sprint! Final Audit Score: <strong style="color: #ffdd00">${this.stats.score} pts</strong>.</p>
        <button class="btn-primary" id="btnPlayAgain">CLOCK IN AGAIN</button>
      </div>
    `;

    document.getElementById('btnPlayAgain')!.addEventListener('click', () => {
      sound.playPowerUp();
      this.showCharacterSelect();
    });
  }
}

// Utility: Draw circle
function ctxCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// Instantiate game after page mounts
window.addEventListener('DOMContentLoaded', () => {
  (window as unknown as { game: Game }).game = new Game();
});
