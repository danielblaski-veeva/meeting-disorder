import { Entity } from '../entities/Entity';
import { AttackConfig, Box3D } from '../types';

export class CollisionSystem {
  // Toggle this true during debugging to see combat range bounds
  debugMode: boolean = false;

  // 1. Check if two physical entities collide/overlap in 2.5D space
  checkEntityOverlap(e1: Entity, e2: Entity): boolean {
    if (e1.state === 'die' || e2.state === 'die') return false;

    const b1 = e1.getCollisionBox();
    const b2 = e2.getCollisionBox();

    // Check overlap across X, Y (depth), and Z (height)
    const overlapX = b1.x < b2.x + b2.width && b1.x + b1.width > b2.x;
    const overlapY = b1.y < b2.y + b2.depth && b1.y + b1.depth > b2.y;
    const overlapZ = b1.z < b2.z + b2.height && b1.z + b1.height > b2.z;

    return overlapX && overlapY && overlapZ;
  }

  // 2. Resolve pushing overlap between two physical bodies on the floor
  resolvePushing(e1: Entity, e2: Entity) {
    if (this.checkEntityOverlap(e1, e2)) {
      // Calculate depth distance vector on the floor flat plane (X & Y axes)
      const dx = e1.pos.x - e2.pos.x;
      const dy = e1.pos.y - e2.pos.y;
      
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

      // Push them away from each other slightly
      const pushForce = 0.5;
      const pushX = (dx / dist) * pushForce;
      const pushY = (dy / dist) * pushForce * 0.5; // less force vertically on floor depth

      e1.pos.x += pushX;
      e1.pos.y += pushY;
      e2.pos.x -= pushX;
      e2.pos.y -= pushY;
    }
  }

  // 3. 2.5D Hitbox vs Hurtbox overlapping
  checkAttackConnects(attacker: Entity, target: Entity, attack: AttackConfig): boolean {
    if (attacker.state === 'die' || target.state === 'die') return false;
    if (target.isInvulnerable) return false;

    // Calculate hitbox center based on attacker's facing direction
    const facingOffset = attacker.facing * (attack.hitboxWidth / 2 + 10);
    const hitboxX = attacker.pos.x + facingOffset;
    const hitboxY = attacker.pos.y + attack.offsetY;
    const hitboxZ = attacker.pos.z + attack.offsetZ;

    const b1: Box3D = {
      x: hitboxX - attack.hitboxWidth / 2,
      y: hitboxY - attack.hitboxDepth / 2,
      z: hitboxZ - attack.hitboxHeight / 2,
      width: attack.hitboxWidth,
      height: attack.hitboxHeight,
      depth: attack.hitboxDepth
    };

    const b2 = target.getCollisionBox();

    // Check intersection
    const overlapX = b1.x < b2.x + b2.width && b1.x + b1.width > b2.x;
    const overlapY = b1.y < b2.y + b2.depth && b1.y + b1.depth > b2.y;
    const overlapZ = b1.z < b2.z + b2.height && b1.z + b1.height > b2.z;

    return overlapX && overlapY && overlapZ;
  }

  // 4. Debug visualizer
  drawAttackHitbox(ctx: CanvasRenderingContext2D, attacker: Entity, attack: AttackConfig) {
    if (!this.debugMode) return;

    const facingOffset = attacker.facing * (attack.hitboxWidth / 2 + 10);
    const hitboxX = attacker.pos.x + facingOffset;
    const hitboxY = attacker.pos.y + attack.offsetY;
    const hitboxZ = attacker.pos.z + attack.offsetZ;

    // Screen coordinates
    const screenX = hitboxX;
    const screenY = hitboxY - hitboxZ;

    ctx.save();
    // 2.5D flat range box on the floor
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(hitboxX, hitboxY, attack.hitboxWidth / 2, attack.hitboxDepth / 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Active vertical hitzone box
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.7)';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      screenX - attack.hitboxWidth / 2,
      screenY - attack.hitboxHeight / 2,
      attack.hitboxWidth,
      attack.hitboxHeight
    );
    ctx.restore();
  }
}

export const collisions = new CollisionSystem();
