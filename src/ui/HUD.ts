import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { GameStats } from '../types';

export class HUD {
  private comboDisplayTimer: number = 0;
  private currentComboCount: number = 0;
  private scalePulse: number = 1.0;

  triggerCombo(count: number) {
    this.currentComboCount = count;
    this.comboDisplayTimer = 60; // Show for 1 second (60 frames)
    this.scalePulse = 1.4; // Jump in size
  }

  update() {
    if (this.comboDisplayTimer > 0) {
      this.comboDisplayTimer--;
    }
    if (this.scalePulse > 1.0) {
      this.scalePulse -= 0.08;
    } else {
      this.scalePulse = 1.0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, player: Player, stats: GameStats, activeBoss: Enemy | null) {
    ctx.save();

    // 1. TOP-LEFT: Player HP and Coffee/Energy Bars
    const barWidth = 200;
    const barHeight = 16;
    const paddingX = 25;
    const paddingY = 25;

    // Glassmorphic panel backdrop
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(paddingX - 10, paddingY - 15, barWidth + 85, 75, 8);
    ctx.fill();
    ctx.stroke();

    // Class Name label
    ctx.fillStyle = player.color;
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(player.classType.replace('_', ' ').toUpperCase(), paddingX, paddingY + 3);

    // HP Bar
    const hpY = paddingY + 12;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(paddingX, hpY, barWidth, barHeight); // BG
    
    const hpRatio = player.hp / player.maxHp;
    const hpColor = hpRatio > 0.4 ? '#10b981' : hpRatio > 0.18 ? '#fbbf24' : '#ef4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(paddingX, hpY, barWidth * hpRatio, barHeight); // Fill

    // HP Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "Outfit", sans-serif';
    ctx.fillText(`HP: ${Math.ceil(player.hp)} / ${player.maxHp}`, paddingX + 8, hpY + 12);

    // Coffee/Energy Bar
    const coffeeY = hpY + barHeight + 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(paddingX, coffeeY, barWidth, barHeight - 4); // BG
    
    const coffeeRatio = player.coffee / player.maxCoffee;
    ctx.fillStyle = '#f59e0b'; // Gold Coffee Neon
    ctx.fillRect(paddingX, coffeeY, barWidth * coffeeRatio, barHeight - 4); // Fill

    // Coffee Icon / Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px "Outfit", sans-serif';
    ctx.fillText(`COFFEE: ${Math.ceil(player.coffee)}%`, paddingX + 8, coffeeY + 8);

    // Character Thumbnail (Face sketch)
    ctx.strokeStyle = player.color;
    ctx.strokeRect(paddingX + barWidth + 10, hpY, 50, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(paddingX + barWidth + 10, hpY, 50, 40);
    ctx.fillStyle = player.color;
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(player.classType === 'developer' ? '👨‍💻' : player.classType === 'product_manager' ? '👩‍💼' : '🎨', paddingX + barWidth + 35, hpY + 28);


    // 2. TOP-CENTER: Wave and Enemies Display
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.roundRect(ctx.canvas.width / 2 - 80, 10, 160, 45, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`WAVE 0${stats.wave}`, ctx.canvas.width / 2, 28);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Outfit", sans-serif';
    ctx.fillText(`ENEMIES LEFT: ${stats.enemiesDefeated}`, ctx.canvas.width / 2, 44);


    // 3. COMBO DISPLAY (Fades out, pulse animation)
    if (this.comboDisplayTimer > 0 && this.currentComboCount >= 2) {
      const alpha = Math.min(1, this.comboDisplayTimer / 15);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'left';

      // Combo Text
      ctx.fillStyle = '#ffdd00';
      ctx.shadowColor = 'rgba(255, 221, 0, 0.5)';
      ctx.shadowBlur = 10;
      
      const fontSize = Math.floor(14 * this.scalePulse);
      ctx.font = `${fontSize}px "Press Start 2P"`;
      
      const bounceOffset = Math.sin(Date.now() * 0.01) * 3;
      ctx.fillText(`${this.currentComboCount} HITS!`, 25, 130 + bounceOffset);

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px "Outfit", sans-serif';
      ctx.fillText('PRODUCTIVITY BOOSTING', 25, 148 + bounceOffset);
      ctx.restore();
    }


    // 4. BOTTOM-CENTER: Boss Health Bar (Only if Boss is present)
    if (activeBoss && activeBoss.state !== 'die') {
      const bWidth = 500;
      const bHeight = 18;
      const bX = (ctx.canvas.width - bWidth) / 2;
      const bY = ctx.canvas.height - 45;

      // Backdrop panel
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)'; // Pink tint border
      ctx.beginPath();
      ctx.roundRect(bX - 15, bY - 22, bWidth + 30, 48, 8);
      ctx.fill();
      ctx.stroke();

      // Boss Name
      ctx.fillStyle = '#ec4899';
      ctx.font = '7px "Press Start 2P"';
      ctx.textAlign = 'left';
      ctx.fillText('BOSS: COFFEE MACHINE ANOMALY', bX, bY - 8);

      // Boss HP Fill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(bX, bY, bWidth, bHeight);

      const bossRatio = activeBoss.hp / activeBoss.maxHp;
      ctx.fillStyle = '#ec4899'; // Bright pink neon
      ctx.fillRect(bX, bY, bWidth * bossRatio, bHeight);

      // HP text inside
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(activeBoss.hp)} / ${activeBoss.maxHp}`, ctx.canvas.width / 2, bY + 13);
    }

    ctx.restore();
  }
}

export const hud = new HUD();
