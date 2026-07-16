import { Vector3D, CharacterState, CharacterType, Box3D } from '../types';

export class Entity {
  id: string;
  type: CharacterType;
  pos: Vector3D = { x: 0, y: 0, z: 0 };
  vel: Vector3D = { x: 0, y: 0, z: 0 };
  
  width: number = 40;
  height: number = 70;
  depth: number = 20;

  hp: number = 100;
  maxHp: number = 100;
  
  facing: number = 1; // 1 = Right, -1 = Left
  state: CharacterState = 'idle';

  isGrounded: boolean = true;
  isInvulnerable: boolean = false;
  invulnTimer: number = 0;
  
  hitstunTimer: number = 0;
  knockback: Vector3D = { x: 0, y: 0, z: 0 };

  // Anim details
  animFrame: number = 0;
  animTimer: number = 0;
  animSpeed: number = 8; // ticks per frame

  color: string = '#ffffff';

  constructor(type: CharacterType, x: number, y: number) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.type = type;
    this.pos.x = x;
    this.pos.y = y;
    this.pos.z = 0;
  }

  update() {
    // 1. Invulnerability
    if (this.invulnTimer > 0) {
      this.invulnTimer--;
      if (this.invulnTimer <= 0) this.isInvulnerable = false;
    }

    // 2. Hitstun & Knockback decay
    if (this.hitstunTimer > 0) {
      this.hitstunTimer--;
      
      // Move using knockback velocity
      this.pos.x += this.knockback.x;
      this.pos.y += this.knockback.y;
      this.pos.z += this.knockback.z;

      // Friction on knockback
      this.knockback.x *= 0.92;
      this.knockback.y *= 0.92;
      this.knockback.z *= 0.92;

      // Bounce knockback off walls
      if (this.pos.x < 50) { this.pos.x = 50; this.knockback.x *= -0.5; }
      if (this.pos.x > 910) { this.pos.x = 910; this.knockback.x *= -0.5; }

      this.state = 'hit';
    }

    // Apply gravity
    if (this.pos.z > 0 || this.vel.z > 0) {
      this.vel.z -= 0.35; // Gravity
      this.pos.z += this.vel.z;
      this.isGrounded = false;
    }

    // Land on ground
    if (this.pos.z <= 0) {
      this.pos.z = 0;
      this.vel.z = 0;
      this.isGrounded = true;
      if (this.state === 'jump') {
        this.state = 'idle';
      }
    }

    // Update animations
    this.animTimer++;
    if (this.animTimer >= this.animSpeed) {
      this.animTimer = 0;
      this.animFrame++;
    }
  }

  takeDamage(amount: number, knockback: Vector3D, hitstun: number) {
    if (this.isInvulnerable || this.hp <= 0) return false;

    this.hp -= amount;
    if (this.hp < 0) this.hp = 0;

    // Apply knockback
    this.knockback = { ...knockback };
    this.hitstunTimer = hitstun;
    this.isInvulnerable = true;
    this.invulnTimer = hitstun + 20; // Slightly longer invuln frame
    
    this.state = 'hit';

    if (this.hp <= 0) {
      this.state = 'die';
      this.invulnTimer = 99999; // Stays dead
    }

    return true;
  }

  // Get physical boundary box (AABB 3D)
  getCollisionBox(): Box3D {
    return {
      x: this.pos.x - this.width / 2,
      y: this.pos.y - this.depth / 2,
      z: this.pos.z,
      width: this.width,
      height: this.height,
      depth: this.depth
    };
  }

  // Draw ground shadow (essential for depth/jumping visualization in 2.5D)
  drawShadow(ctx: CanvasRenderingContext2D) {
    if (this.state === 'die') return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    
    // Shadow size shrinks when high up in the air
    const shadowScale = Math.max(0.3, 1 - (this.pos.z / 180));
    const sw = this.width * 0.9 * shadowScale;
    const sd = this.depth * 0.8 * shadowScale;
    
    // Draw an oval shadow on the floor (at y, where z = 0)
    ctx.ellipse(this.pos.x, this.pos.y, sw / 2, sd / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Standard procedural sprite drawing fallback
  draw(ctx: CanvasRenderingContext2D) {
    if (this.state === 'die') return;

    const screenX = this.pos.x;
    const screenY = this.pos.y - this.pos.z;

    ctx.save();

    // Flash white when hit/invulnerable
    if (this.isInvulnerable && Math.floor(Date.now() / 50) % 2 === 0) {
      ctx.filter = 'brightness(2) contrast(1.5)';
    }

    ctx.translate(screenX, screenY);
    ctx.scale(this.facing, 1);

    // Draw procedural retro character
    this.drawProceduralCharacter(ctx);

    ctx.restore();
  }

  protected drawProceduralCharacter(ctx: CanvasRenderingContext2D) {
    // Draw generic retro figure if not overridden
    ctx.fillStyle = this.color;
    // Torso
    ctx.fillRect(-10, -50, 20, 35);
    // Head
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(-8, -65, 16, 15);
    // Legs
    ctx.fillStyle = '#000000';
    ctx.fillRect(-8, -15, 6, 15);
    ctx.fillRect(2, -15, 6, 15);
  }
}
