import { Entity } from './Entity';
import { input } from '../input';
import { AttackConfig, CharacterState, CharacterType } from '../types';
import { sound } from '../system/Sound';
import { particles } from '../system/Particle';

export class Player extends Entity {
  coffee: number = 20; // Special energy bar (starts at 20, max 100)
  maxCoffee: number = 100;
  
  comboStep: number = 0;
  comboTimer: number = 0;
  comboWindow: number = 40; // Frames allowed between strikes to continue combo

  speedX: number = 4.2;
  speedY: number = 2.4;
  friction: number = 0.85;

  currentAttack: AttackConfig | null = null;
  attackTimer: number = 0;
  attackDuration: number = 0;
  hasHitThisAttack: boolean = false;

  // Selected class
  classType: 'developer' | 'product_manager' | 'designer';

  // Specific attacks
  attacks: { [key: string]: AttackConfig } = {};

  constructor(classType: 'developer' | 'product_manager' | 'designer', x: number, y: number) {
    super(classType as CharacterType, x, y);
    this.classType = classType;

    this.setupClassStats();
  }

  private setupClassStats() {
    if (this.classType === 'developer') {
      this.color = '#38bdf8'; // Cyan
      this.hp = 110;
      this.maxHp = 110;
      this.speedX = 4.0;
      this.speedY = 2.2;

      // Attacks
      this.attacks = {
        attack1: {
          name: 'Keyboard Click', damage: 10,
          hitboxWidth: 55, hitboxHeight: 40, hitboxDepth: 20,
          offsetY: 0, offsetZ: 15, knockbackX: 3, knockbackY: 0.2, knockbackZ: 1.5,
          hitstun: 15, energyRecover: 8
        },
        attack2: {
          name: 'Keyboard Clack', damage: 12,
          hitboxWidth: 60, hitboxHeight: 40, hitboxDepth: 20,
          offsetY: 0, offsetZ: 15, knockbackX: 4, knockbackY: -0.2, knockbackZ: 1.5,
          hitstun: 15, energyRecover: 8
        },
        attack3: {
          name: 'Merge Conflict Push', damage: 20,
          hitboxWidth: 70, hitboxHeight: 50, hitboxDepth: 30,
          offsetY: 0, offsetZ: 20, knockbackX: 12, knockbackY: 0, knockbackZ: 4,
          hitstun: 25, energyRecover: 12
        }
      };
    } else if (this.classType === 'product_manager') {
      this.color = '#fbbf24'; // Yellow
      this.hp = 90;
      this.maxHp = 90;
      this.speedX = 4.5;
      this.speedY = 2.6;

      this.attacks = {
        attack1: {
          name: 'Sticky Slap', damage: 8,
          hitboxWidth: 50, hitboxHeight: 35, hitboxDepth: 15,
          offsetY: 0, offsetZ: 25, knockbackX: 2.5, knockbackY: 0, knockbackZ: 1.0,
          hitstun: 12, energyRecover: 10
        },
        attack2: {
          name: 'Whiteboard Sweep', damage: 10,
          hitboxWidth: 65, hitboxHeight: 40, hitboxDepth: 20,
          offsetY: 0, offsetZ: 20, knockbackX: 3.5, knockbackY: 0, knockbackZ: 1.5,
          hitstun: 12, energyRecover: 10
        },
        attack3: {
          name: 'SYNERGY Scream', damage: 18,
          hitboxWidth: 80, hitboxHeight: 60, hitboxDepth: 35,
          offsetY: 0, offsetZ: 15, knockbackX: 10, knockbackY: 0, knockbackZ: 3.0,
          hitstun: 20, energyRecover: 15
        }
      };
    } else { // designer
      this.color = '#c084fc'; // Purple
      this.hp = 100;
      this.maxHp = 100;
      this.speedX = 4.2;
      this.speedY = 2.4;

      this.attacks = {
        attack1: {
          name: 'Stylus Poke', damage: 11,
          hitboxWidth: 60, hitboxHeight: 30, hitboxDepth: 15,
          offsetY: 0, offsetZ: 15, knockbackX: 3.2, knockbackY: 0, knockbackZ: 1.2,
          hitstun: 14, energyRecover: 9
        },
        attack2: {
          name: 'Color Stroke', damage: 13,
          hitboxWidth: 65, hitboxHeight: 35, hitboxDepth: 18,
          offsetY: 0, offsetZ: 15, knockbackX: 4.2, knockbackY: 0, knockbackZ: 1.2,
          hitstun: 14, energyRecover: 9
        },
        attack3: {
          name: 'Creative Redesign', damage: 22,
          hitboxWidth: 75, hitboxHeight: 45, hitboxDepth: 25,
          offsetY: 0, offsetZ: 20, knockbackX: 11, knockbackY: 0, knockbackZ: 3.5,
          hitstun: 22, energyRecover: 13
        }
      };
    }
  }

  update() {
    super.update();

    if (this.state === 'die') return;

    // Decent combo timing window decay
    if (this.comboTimer > 0) {
      this.comboTimer--;
      if (this.comboTimer <= 0) {
        this.comboStep = 0; // reset combo chain
      }
    }

    // Handled in Hitstun (cannot act)
    if (this.hitstunTimer > 0) return;

    // Handle Attack updates
    if (this.state.startsWith('attack')) {
      this.attackTimer++;
      
      // Decelerate quickly during regular attacks
      this.vel.x *= 0.75;
      this.vel.y *= 0.75;
      this.pos.x += this.vel.x;
      this.pos.y += this.vel.y;

      if (this.attackTimer >= this.attackDuration) {
        this.state = 'idle';
        this.currentAttack = null;
      }
      return; // Lock movement inputs during attack frames
    }

    // --- Active Inputs ---
    
    // Jump Action
    if (input.isJumpPressed && this.isGrounded) {
      this.vel.z = 6.8;
      this.isGrounded = false;
      this.state = 'jump';
      sound.playJump();
      
      // Dust particles at launch
      particles.createSparks(this.pos.x, this.pos.y, 0, '#ffffff', 4);
    }

    // Attacks Input
    if (input.isAttackPressed) {
      this.triggerAttack();
      return;
    }

    // Special Ultimate Input
    if (input.isSpecialPressed && this.coffee >= 40) {
      this.triggerSpecial();
      return;
    }

    // Horizontal & Vertical Movements
    let dx = 0;
    let dy = 0;

    if (input.isLeft) { dx = -1; this.facing = -1; }
    if (input.isRight) { dx = 1; this.facing = 1; }
    if (input.isUp) { dy = -1; }
    if (input.isDown) { dy = 1; }

    // Normalize diagonal speed
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    this.vel.x += dx * 0.9;
    this.vel.y += dy * 0.6;

    // Apply friction/drag
    this.vel.x *= this.friction;
    this.vel.y *= this.friction;

    // Move player on floor
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    // Map screen boundary limits (x: [50, 910], y: [220, 500])
    if (this.pos.x < 50) this.pos.x = 50;
    if (this.pos.x > 910) this.pos.x = 910;
    if (this.pos.y < 220) this.pos.y = 220;
    if (this.pos.y > 500) this.pos.y = 500;

    // Set walking states
    if (Math.abs(this.vel.x) > 0.3 || Math.abs(this.vel.y) > 0.3) {
      if (this.isGrounded) this.state = 'walk';
    } else if (this.isGrounded) {
      this.state = 'idle';
    }
  }

  private triggerAttack() {
    this.comboStep++;
    if (this.comboStep > 3) this.comboStep = 1;

    const attackKey = `attack${this.comboStep}`;
    this.currentAttack = this.attacks[attackKey];
    this.state = attackKey as CharacterState;
    
    this.attackTimer = 0;
    this.attackDuration = 18; // Frames
    this.hasHitThisAttack = false;

    // Set combo cooldown buffer
    this.comboTimer = this.comboWindow;

    sound.playSlash();

    // Dash slightly in direction player is facing when striking
    this.vel.x = this.facing * 2.5;
  }

  private triggerSpecial() {
    this.coffee -= 40;
    this.state = 'attack3'; // Uses high frame
    this.currentAttack = {
      name: this.classType === 'developer' ? 'Merge Conflict' : this.classType === 'product_manager' ? 'Scope Creep' : 'Pixel Perfect Redesign',
      damage: 35,
      hitboxWidth: 350,
      hitboxHeight: 180,
      hitboxDepth: 100,
      offsetY: 0,
      offsetZ: 20,
      knockbackX: this.facing * 14,
      knockbackY: 0,
      knockbackZ: 6,
      hitstun: 40
    };

    this.attackTimer = 0;
    this.attackDuration = 45; // Longer ultimate frame freeze
    this.hasHitThisAttack = false;

    sound.playExplosion();
    particles.createDamageText(this.pos.x, this.pos.y, this.pos.z + 50, this.currentAttack.name.toUpperCase() + '!!!', this.color);

    if (this.classType === 'developer') {
      // Spawn floating code lines around player
      for (let i = 0; i < 20; i++) {
        particles.addParticle({
          x: this.pos.x + (Math.random() * 200 - 100),
          y: this.pos.y + (Math.random() * 100 - 50),
          z: 300,
          vx: 0, vy: 0, vz: -4 - Math.random() * 5,
          color: 'transparent', size: 12, life: 0, maxLife: 60,
          type: 'text', text: Math.random() > 0.5 ? 'git merge' : '0xDEADBEEF',
          textColor: '#22c55e', gravity: 0
        });
      }
    } else if (this.classType === 'product_manager') {
      // Screaming shockwaves
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (this.state === 'die') return;
          particles.createSparks(this.pos.x, this.pos.y, 25, '#fbbf24', 15);
        }, i * 100);
      }
    } else {
      // Paint splatters
      particles.createCoffeeSpill(this.pos.x + this.facing * 60, this.pos.y, 20, 20);
      // Create multi colored pixel bursts
      const colors = ['#ec4899', '#a855f7', '#3b82f6', '#10b981'];
      colors.forEach(col => {
        particles.createSparks(this.pos.x, this.pos.y, 20, col, 10);
      });
    }
  }

  addCoffee(amount: number) {
    this.coffee += amount;
    if (this.coffee > this.maxCoffee) this.coffee = this.maxCoffee;
  }

  protected drawProceduralCharacter(ctx: CanvasRenderingContext2D) {
    const isAttacking = this.state.startsWith('attack');
    const walkCycle = Math.sin(this.animFrame * 0.4);
    
    // 1. Draw Player base body (hoodie/suit)
    let bodyColor = this.color;
    let pantsColor = '#1e1b4b'; // dark blue
    let skinColor = '#ffdbac';  // Peach skin

    // 2. Head & Hair
    ctx.fillStyle = skinColor;
    ctx.fillRect(-8, -60, 16, 16); // Head

    // Hair details based on character class
    if (this.classType === 'developer') {
      // Cute cyan gaming headset / headphones
      ctx.fillStyle = '#0f172a'; // dark hair
      ctx.fillRect(-9, -61, 18, 5);
      ctx.fillStyle = bodyColor; // Neon earcups
      ctx.fillRect(-10, -56, 3, 7);
      ctx.fillRect(7, -56, 3, 7);
    } else if (this.classType === 'product_manager') {
      // Neat groomed business hair
      ctx.fillStyle = '#78350f'; // brown hair
      ctx.fillRect(-9, -62, 18, 5);
      ctx.fillRect(4, -58, 5, 8);
      // Small yellow glasses
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-5, -53, 4, 3);
      ctx.strokeRect(1, -53, 4, 3);
    } else {
      // Purple designer beret / hat
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.ellipse(0, -61, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-3, -65, 2, 4); // Beret stem
    }

    // 3. Body Torso
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-11, -44, 22, 30); // Torso

    // Corporate Identity detailing (ties/logo)
    if (this.classType === 'developer') {
      // Draw a small "Code" bracket logo <> on chest
      ctx.fillStyle = '#ffffff';
      ctx.font = '7px "Press Start 2P"';
      ctx.fillText('<>', -6, -26);
    } else if (this.classType === 'product_manager') {
      // Draw neat necktie
      ctx.fillStyle = '#ef4444'; // Red tie
      ctx.fillRect(-2, -44, 4, 15);
      ctx.beginPath();
      ctx.moveTo(-2, -29);
      ctx.lineTo(2, -29);
      ctx.lineTo(0, -25);
      ctx.closePath();
      ctx.fill();
    } else {
      // Designer scarf
      ctx.fillStyle = '#fb7185'; // Rose scarf
      ctx.fillRect(-12, -44, 24, 4);
      ctx.fillRect(4, -40, 4, 12);
    }

    // 4. Legs Walking Animation Cycle
    ctx.fillStyle = pantsColor;
    let legOffset = isAttacking ? 0 : walkCycle * 6;
    
    if (this.state === 'walk') {
      // Leg 1 (Front-ish)
      ctx.fillRect(-9, -14, 6, 15 + legOffset);
      // Leg 2 (Back-ish)
      ctx.fillRect(3, -14, 6, 15 - legOffset);
    } else if (this.state === 'jump') {
      // Bent knees
      ctx.fillRect(-9, -14, 6, 10);
      ctx.fillRect(3, -14, 6, 10);
    } else {
      // Standing
      ctx.fillRect(-8, -14, 5, 15);
      ctx.fillRect(3, -14, 5, 15);
    }

    // 5. Arms and Weapon swing animations
    ctx.fillStyle = skinColor;
    if (isAttacking) {
      // Swing arm forward!
      ctx.save();
      ctx.fillStyle = bodyColor;
      ctx.translate(4, -30);
      ctx.rotate(-Math.PI / 4 + (this.attackTimer * 0.12)); // Swing arc
      ctx.fillRect(0, -4, 22, 8); // Arm holding weapon

      // Draw active Weapons!
      if (this.classType === 'developer') {
        // Ergonomic glowing keyboard!
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(18, -14, 10, 26);
        ctx.fillStyle = '#00f0ff'; // glowing key caps
        ctx.fillRect(20, -12, 3, 22);
        ctx.fillRect(24, -12, 2, 22);
      } else if (this.classType === 'product_manager') {
        // Megaphone yelling!
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(18, -8, 12, 14);
        ctx.fillStyle = '#ef4444'; // mega-horn front
        ctx.beginPath();
        ctx.moveTo(30, -14);
        ctx.lineTo(30, 20);
        ctx.lineTo(22, 6);
        ctx.lineTo(22, -6);
        ctx.closePath();
        ctx.fill();
      } else {
        // Stylus stylus pen!
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(18, -2);
        ctx.lineTo(35, 10);
        ctx.stroke();
        ctx.fillStyle = '#ec4899'; // Pink glowing neon tip
        ctx.fillRect(34, 9, 3, 3);
      }
      ctx.restore();
    } else {
      // Normal arm swaying
      const armSway = this.state === 'walk' ? walkCycle * 4 : 0;
      ctx.fillStyle = bodyColor;
      // Back Arm
      ctx.fillRect(-14, -36, 4, 14 - armSway);
      // Front Arm
      ctx.fillRect(10, -36, 4, 14 + armSway);
    }
  }
}
