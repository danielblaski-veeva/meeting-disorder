import { ParticleConfig } from '../types';

export class ParticleSystem {
  private particles: ParticleConfig[] = [];

  addParticle(config: ParticleConfig) {
    this.particles.push({
      ...config,
      gravity: config.gravity ?? 0.3
    });
  }

  // Quick explosion helper
  createSparks(x: number, y: number, z: number, color: string = '#ff0055', count: number = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.addParticle({
        x, y, z,
        vx: Math.cos(angle) * speed,
        vy: (Math.sin(angle) * speed) * 0.5, // 2.5D depth squishing
        vz: 1 + Math.random() * 4,
        color,
        size: 2 + Math.random() * 3,
        life: 0,
        maxLife: 20 + Math.random() * 20,
        type: 'spark'
      });
    }
  }

  createCoffeeSpill(x: number, y: number, z: number, count: number = 10) {
    for (let i = 0; i < count; i++) {
      const speedX = (Math.random() * 2 - 1) * 2;
      const speedY = (Math.random() * 2 - 1) * 0.8;
      this.addParticle({
        x, y, z,
        vx: speedX,
        vy: speedY,
        vz: 1.5 + Math.random() * 3.5,
        color: '#704214', // Coffee Brown
        size: 3 + Math.random() * 4,
        life: 0,
        maxLife: 35 + Math.random() * 15,
        type: 'coffee'
      });
    }
  }

  createFlyingPapers(x: number, y: number, z: number, count: number = 5) {
    for (let i = 0; i < count; i++) {
      this.addParticle({
        x, y, z,
        vx: (Math.random() * 2 - 1) * 1.5,
        vy: (Math.random() * 2 - 1) * 0.5,
        vz: 2 + Math.random() * 4,
        color: '#ffffff',
        size: 4 + Math.random() * 4,
        life: 0,
        maxLife: 40 + Math.random() * 20,
        type: 'paper',
        gravity: 0.1 // Lighter floating gravity
      });
    }
  }

  createDamageText(x: number, y: number, z: number, text: string, color: string = '#ffffff') {
    this.addParticle({
      x, y, z: z + 20,
      vx: (Math.random() * 2 - 1) * 0.4,
      vy: -0.2,
      vz: 1.2, // Floats steadily upwards
      color: 'transparent',
      size: 14,
      life: 0,
      maxLife: 45,
      type: 'text',
      text,
      textColor: color,
      gravity: -0.02 // Counter-gravity float upward
    });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;

      // Apply positions
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // Apply gravity to vertical height Z
      if (p.z > 0 || p.vz > 0) {
        p.vz -= p.gravity ?? 0.3;
      }

      // Ground bounce for splash particles
      if (p.z < 0) {
        p.z = 0;
        if (p.type === 'coffee') {
          p.vx *= 0.5;
          p.vy *= 0.5;
          p.vz = 0; // stop moving up
        } else {
          p.vz = -p.vz * 0.4; // slight bounce
          p.vx *= 0.7;
        }
      }

      // Remove dead particles
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Sort particles by their floor-y position so they depth-sort correctly with entities
    const sorted = [...this.particles].sort((a, b) => a.y - b.y);

    sorted.forEach((p) => {
      const screenX = p.x;
      const screenY = p.y - p.z; // 2.5D math: Draw coordinate subtracts vertical offset z

      const alpha = 1 - (p.life / p.maxLife);
      ctx.save();

      if (p.type === 'text' && p.text) {
        ctx.font = 'bold 12px "Outfit", sans-serif';
        ctx.fillStyle = p.textColor || '#ffffff';
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        // Add text shadow
        ctx.shadowColor = 'rgba(0,0,0,1)';
        ctx.shadowBlur = 4;
        ctx.fillText(p.text, screenX, screenY);
      } else if (p.type === 'paper') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.translate(screenX, screenY);
        ctx.rotate(p.life * 0.08);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      } else if (p.type === 'coffee') {
        // Spill pool on floor vs splatter in air
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        if (p.z <= 0) {
          // Flat splash puddle
          ctx.beginPath();
          ctx.ellipse(screenX, screenY, p.size * 1.5, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Drops
          ctx.beginPath();
          ctx.arc(screenX, screenY, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Spark particles
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillRect(screenX - p.size / 2, screenY - p.size / 2, p.size, p.size);
      }

      ctx.restore();
    });
  }
}

export const particles = new ParticleSystem();
