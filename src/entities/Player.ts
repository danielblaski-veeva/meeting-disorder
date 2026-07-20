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
  classType: 'consultant' | 'deployment_engineer' | 'support';

  // Specific attacks
  attacks: { [key: string]: AttackConfig } = {};

  constructor(classType: 'consultant' | 'deployment_engineer' | 'support', x: number, y: number) {
    super(classType as CharacterType, x, y);
    this.classType = classType;

    this.setupClassStats();
  }

  private setupClassStats() {
    if (this.classType === 'consultant') {
      this.color = '#10b981'; // Mint Green / Emerald
      this.hp = 85;
      this.maxHp = 85;
      this.speedX = 5.0;
      this.speedY = 2.8;

      // Attacks
      this.attacks = {
        attack1: {
          name: 'Laser Point Strike', damage: 9,
          hitboxWidth: 65, hitboxHeight: 35, hitboxDepth: 15,
          offsetY: 0, offsetZ: 15, knockbackX: 2.5, knockbackY: 0.1, knockbackZ: 1.0,
          hitstun: 12, energyRecover: 8
        },
        attack2: {
          name: 'Slide Deck Shuriken', damage: 12,
          hitboxWidth: 70, hitboxHeight: 35, hitboxDepth: 15,
          offsetY: 0, offsetZ: 15, knockbackX: 3.0, knockbackY: 0.1, knockbackZ: 1.0,
          hitstun: 14, energyRecover: 8
        },
        attack3: {
          name: 'Synergy Dash', damage: 18,
          hitboxWidth: 85, hitboxHeight: 45, hitboxDepth: 25,
          offsetY: 0, offsetZ: 20, knockbackX: 9.0, knockbackY: 0, knockbackZ: 3.0,
          hitstun: 20, energyRecover: 12
        }
      };
    } else if (this.classType === 'deployment_engineer') {
      this.color = '#3b82f6'; // Electric Tech Blue
      this.hp = 130;
      this.maxHp = 130;
      this.speedX = 3.4;
      this.speedY = 1.8;

      this.attacks = {
        attack1: {
          name: 'CAT6 Cable Whip', damage: 12,
          hitboxWidth: 75, hitboxHeight: 45, hitboxDepth: 25,
          offsetY: 0, offsetZ: 15, knockbackX: 4.5, knockbackY: 0.3, knockbackZ: 1.8,
          hitstun: 16, energyRecover: 10
        },
        attack2: {
          name: 'Server Blade Slash', damage: 15,
          hitboxWidth: 80, hitboxHeight: 45, hitboxDepth: 25,
          offsetY: 0, offsetZ: 15, knockbackX: 5.5, knockbackY: -0.3, knockbackZ: 1.8,
          hitstun: 16, energyRecover: 10
        },
        attack3: {
          name: 'Server Crash Smash', damage: 25,
          hitboxWidth: 95, hitboxHeight: 55, hitboxDepth: 35,
          offsetY: 0, offsetZ: 20, knockbackX: 13, knockbackY: 0, knockbackZ: 5.0,
          hitstun: 26, energyRecover: 15
        }
      };
    } else { // support
      this.color = '#ec4899'; // Hot Pink
      this.hp = 105;
      this.maxHp = 105;
      this.speedX = 4.2;
      this.speedY = 2.4;

      this.attacks = {
        attack1: {
          name: 'Receiver Jab', damage: 10,
          hitboxWidth: 55, hitboxHeight: 35, hitboxDepth: 18,
          offsetY: 0, offsetZ: 15, knockbackX: 3.2, knockbackY: 0.1, knockbackZ: 1.2,
          hitstun: 14, energyRecover: 9
        },
        attack2: {
          name: 'Receiver Hook', damage: 12,
          hitboxWidth: 60, hitboxHeight: 35, hitboxDepth: 18,
          offsetY: 0, offsetZ: 15, knockbackX: 3.8, knockbackY: 0.1, knockbackZ: 1.2,
          hitstun: 14, energyRecover: 9
        },
        attack3: {
          name: 'Ringing Slam', damage: 20,
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

    // Dash slightly in direction player is facing when striking (customized by classType!)
    if (this.classType === 'consultant') {
      this.vel.x = this.facing * 3.6; // High evasive movement
    } else if (this.classType === 'deployment_engineer') {
      this.vel.x = this.facing * 1.5; // Slow, heavy stomp
    } else {
      this.vel.x = this.facing * 2.4; // Balanced brawler
    }
  }

  private triggerSpecial() {
    this.coffee -= 40;
    this.state = 'attack3'; // Uses high frame
    this.currentAttack = {
      name: this.classType === 'consultant' ? 'Paradigm Shift' : this.classType === 'deployment_engineer' ? 'System Reboot' : 'Escalation',
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

    if (this.classType === 'consultant') {
      // Spawn floating buzzword text particles around player
      const buzzwords = ['SYNERGY', 'PARADIGM', 'KPI', 'ROI', 'AGILE', 'DELIVERABLE', 'OUT OF OFFICE', 'PITCH DECK'];
      for (let i = 0; i < 20; i++) {
        const text = buzzwords[Math.floor(Math.random() * buzzwords.length)];
        particles.addParticle({
          x: this.pos.x + (Math.random() * 200 - 100),
          y: this.pos.y + (Math.random() * 100 - 50),
          z: 300,
          vx: (Math.random() * 2 - 1) * 1.5, vy: (Math.random() * 2 - 1) * 1.0, vz: -4 - Math.random() * 5,
          color: 'transparent', size: 12, life: 0, maxLife: 60,
          type: 'text', text: text,
          textColor: '#10b981', gravity: 0
        });
      }
      particles.createSparks(this.pos.x, this.pos.y, 25, '#10b981', 15);
    } else if (this.classType === 'deployment_engineer') {
      // Technical terminal reboot messages
      const errors = ['sudo reboot -f', '502 BAD GATEWAY', 'STACK OVERFLOW', 'SYSTEM CRITICAL', 'MEMORY LEAK', 'PROD DOWN!!!', 'DOCKER CRASH'];
      for (let i = 0; i < 20; i++) {
        const text = errors[Math.floor(Math.random() * errors.length)];
        particles.addParticle({
          x: this.pos.x + (Math.random() * 200 - 100),
          y: this.pos.y + (Math.random() * 100 - 50),
          z: 300,
          vx: (Math.random() * 2 - 1) * 1.2, vy: (Math.random() * 2 - 1) * 0.8, vz: -5 - Math.random() * 6,
          color: 'transparent', size: 12, life: 0, maxLife: 60,
          type: 'text', text: text,
          textColor: '#3b82f6', gravity: 0
        });
      }
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (this.state === 'die') return;
          particles.createSparks(this.pos.x, this.pos.y, 25, '#3b82f6', 15);
        }, i * 100);
      }
    } else {
      // Support high-stress complaint phone ring text particles
      const calls = ['RIIING!', 'PLEASE HOLD', 'HELL NO', 'ESCALATED', 'REFUND NOW!', 'UNSUBSCRIBE', 'LEAVE REVIEW', 'ANGRY CUSTOMER'];
      for (let i = 0; i < 20; i++) {
        const text = calls[Math.floor(Math.random() * calls.length)];
        particles.addParticle({
          x: this.pos.x + (Math.random() * 200 - 100),
          y: this.pos.y + (Math.random() * 100 - 50),
          z: 300,
          vx: (Math.random() * 2 - 1) * 1.8, vy: (Math.random() * 2 - 1) * 1.2, vz: -3 - Math.random() * 4,
          color: 'transparent', size: 12, life: 0, maxLife: 60,
          type: 'text', text: text,
          textColor: '#ec4899', gravity: 0
        });
      }
      // Paint splatters & multi colored pixel bursts
      particles.createCoffeeSpill(this.pos.x + this.facing * 60, this.pos.y, 20, 20);
      const colors = ['#ec4899', '#f43f5e', '#ffffff', '#db2777'];
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
    
    // 1. Base skin and trousers colors
    let bodyColor = this.color;
    let pantsColor = '#1e1b4b'; // Dark navy corporate trousers
    let skinColor = '#ffdbac';  // Peach skin

    // 2. Draw Head, Hair & Accessories
    ctx.fillStyle = skinColor;
    ctx.fillRect(-8, -60, 16, 16); // Head

    if (this.classType === 'consultant') {
      // Neat dark corporate hair cut
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-9, -62, 18, 5);
      ctx.fillRect(4, -58, 5, 8); // Hair sideburns
      
      // Rectangular designer spectacles
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-5, -53, 4, 3);
      ctx.strokeRect(1, -53, 4, 3);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)'; // Glass lens glare
      ctx.fillRect(-5, -53, 4, 3);
      ctx.fillRect(1, -53, 4, 3);
    } else if (this.classType === 'deployment_engineer') {
      // Yellow utility construction safety helmet
      ctx.fillStyle = '#eab308'; // Bright yellow
      ctx.beginPath();
      ctx.arc(0, -58, 10, Math.PI, 0); // Rounded top
      ctx.fill();
      ctx.fillRect(-11, -59, 22, 2.5); // Helmet rim
      
      // Neon protective safety goggles
      ctx.fillStyle = '#06b6d4'; // Cyan protective glass
      ctx.fillRect(-7, -54, 14, 4);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-7, -54, 14, 4);
    } else {
      // Ruffled support hair with custom headset
      ctx.fillStyle = '#78350f'; // Auburn hair
      ctx.fillRect(-9, -61, 18, 5);
      ctx.fillRect(-8, -56, 4, 10); // long hair strand
      
      // Call-center headset
      ctx.strokeStyle = '#475569'; // Headset headband
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -60, 9, Math.PI, 0);
      ctx.stroke();
      
      // Headset earcup
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(7, -56, 3, 6);
      
      // Headset mic mouthpiece bending down
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, -53);
      ctx.lineTo(3, -48);
      ctx.lineTo(-2, -49);
      ctx.stroke();
    }

    // 3. Torso Drawing (Suits, utility hoodies & blouses)
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-11, -44, 22, 30); // Base Torso

    if (this.classType === 'consultant') {
      // Elegant Charcoal Suit Blazer over emerald shirt
      ctx.fillStyle = '#1e293b'; // Charcoal suit
      ctx.fillRect(-11, -44, 5, 30); // Left sleeve/lapel
      ctx.fillRect(6, -44, 5, 30);  // Right sleeve/lapel
      
      // Silver tie hanging on emerald base shirt
      ctx.fillStyle = '#94a3b8'; // Silver tie
      ctx.fillRect(-1.5, -40, 3, 14);
      ctx.beginPath();
      ctx.moveTo(-1.5, -26);
      ctx.lineTo(1.5, -26);
      ctx.lineTo(0, -22);
      ctx.closePath();
      ctx.fill();
    } else if (this.classType === 'deployment_engineer') {
      // Heavy engineering utility toolbelt
      ctx.fillStyle = '#451a03'; // Brown belt
      ctx.fillRect(-12, -22, 24, 4);
      
      // Silver metal tool clips
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-7, -18, 2.5, 6); // Screwdriver tool
      ctx.fillRect(5, -18, 3, 5);    // Wrench tool
    } else {
      // Cute neck-scarf overlay for the Support
      ctx.fillStyle = '#a855f7'; // Purple neck scarf
      ctx.fillRect(-12, -44, 24, 4);
      ctx.fillRect(4, -40, 4, 10); // Scarf tie
    }

    // 4. Legs Walking Animation Cycle
    ctx.fillStyle = pantsColor;
    let legOffset = isAttacking ? 0 : walkCycle * 6;
    
    if (this.state === 'walk') {
      ctx.fillRect(-9, -14, 6, 15 + legOffset); // Leg 1
      ctx.fillRect(3, -14, 6, 15 - legOffset);  // Leg 2
    } else if (this.state === 'jump') {
      ctx.fillRect(-9, -14, 6, 10); // Bent knees
      ctx.fillRect(3, -14, 6, 10);
    } else {
      ctx.fillRect(-8, -14, 5, 15); // Standing straight
      ctx.fillRect(3, -14, 5, 15);
    }

    // 5. Arms and bespoke Weapon animations!
    ctx.fillStyle = skinColor;
    if (isAttacking) {
      ctx.save();
      ctx.fillStyle = bodyColor;
      ctx.translate(4, -30);
      ctx.rotate(-Math.PI / 4 + (this.attackTimer * 0.12)); // Swing arc
      ctx.fillRect(0, -4, 22, 8); // Arm holding weapon

      // bespoke Weapon Models & Glowing Projectiles
      if (this.classType === 'consultant') {
        if (this.comboStep === 2) {
          // Draw a spinning Slide Deck Shuriken!
          ctx.save();
          ctx.translate(24, 0);
          ctx.rotate(this.attackTimer * 0.5);
          ctx.fillStyle = '#ffffff'; // Paper base
          ctx.fillRect(-8, -8, 16, 16);
          ctx.strokeStyle = '#10b981'; // Green border
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-8, -8, 16, 16);
          ctx.fillStyle = '#10b981'; // Slide content lines
          ctx.fillRect(-5, -4, 10, 2);
          ctx.fillRect(-5, 0, 7, 1.5);
          ctx.restore();
        } else {
          // Laser Pointer device
          ctx.fillStyle = '#020617'; // Sleek dark body
          ctx.fillRect(18, -3, 8, 6);
          
          // Glowing Laser Pointer beam emitted forward!
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#10b981';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(26, 0);
          ctx.lineTo(85, 0); // 60px beam
          ctx.stroke();
          
          // Bright spark at impact tip
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(85, 0, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (this.classType === 'deployment_engineer') {
        if (this.comboStep === 1) {
          // CAT6 Cable Whip
          ctx.strokeStyle = '#b45309'; // Copper wire color
          ctx.lineWidth = 3.5;
          ctx.shadowColor = '#60a5fa'; // Blue electric charge
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(18, 0);
          // Wave pattern whip curve
          ctx.bezierCurveTo(25, -15, 45, 18, 70, -5);
          ctx.stroke();
          
          ctx.fillStyle = '#1e1b4b'; // Dark blue RJ45 plastic modular connector head!
          ctx.fillRect(68, -8, 6, 6);
          ctx.fillStyle = '#f59e0b'; // Gold pins on the whip head
          ctx.fillRect(74, -7, 1.5, 4);
        } else {
          // Giant silver-plated Server Blade with cooling vents
          ctx.fillStyle = '#94a3b8'; // Dull steel
          ctx.fillRect(18, -12, 14, 30); // Large server shelf blade
          
          ctx.fillStyle = '#64748b'; // Bezel details
          ctx.fillRect(20, -10, 10, 2);
          ctx.fillRect(20, -5, 10, 2);
          ctx.fillRect(20, 0, 10, 2);
          
          ctx.strokeStyle = '#3b82f6'; // Bright glowing blue edge
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 10;
          ctx.strokeRect(17, -13, 16, 32);
        }
      } else {
        // Dual-wielding hot pink desk phone receivers!
        ctx.fillStyle = '#db2777'; // Strong pink receiver base
        ctx.fillRect(16, -10, 8, 22); // Hand grip
        
        ctx.beginPath(); // Earpiece
        ctx.arc(20, -10, 7, 0, Math.PI * 2);
        ctx.arc(20, 12, 7, 0, Math.PI * 2);
        ctx.fill();
        
        // Coiled phone cord connecting back to player body
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        // Coiled loops
        ctx.bezierCurveTo(8, -10, -8, 10, -20, -10);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Normal idle / walk arm swaying
      const armSway = this.state === 'walk' ? walkCycle * 4 : 0;
      ctx.fillStyle = bodyColor;
      // Back Arm
      ctx.fillRect(-14, -36, 4, 14 - armSway);
      
      // Front Arm holds a weapon item loosely while idle!
      ctx.save();
      ctx.translate(10, -36);
      ctx.fillRect(0, 0, 4, 14 + armSway);
      
      // Draw idle phone / server clip / laser device tucked in pocket/belt
      ctx.translate(0, 14 + armSway);
      if (this.classType === 'consultant') {
        ctx.fillStyle = '#020617';
        ctx.fillRect(-2, 0, 5, 8); // Laser pointer holster
      } else if (this.classType === 'deployment_engineer') {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-3, 0, 8, 4); // Wrench / tool bundle
      } else {
        ctx.fillStyle = '#db2777';
        ctx.fillRect(-4, 0, 6, 8); // Hot pink phone receiver on hip
      }
      ctx.restore();
    }
  }
}
