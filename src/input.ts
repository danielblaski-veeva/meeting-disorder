export class InputManager {
  private keys: { [key: string]: boolean } = {};
  private prevKeys: { [key: string]: boolean } = {};
  private gamepadIndex: number | null = null;
  private prevGamepadButtons: boolean[] = [];

  constructor() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('gamepadconnected', (e) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepadIndex = e.gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      console.log('Gamepad disconnected');
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  update() {
    // Clone keys to prevKeys for single-press detection
    this.prevKeys = { ...this.keys };

    // Update Gamepad State if connected
    if (this.gamepadIndex !== null) {
      const gp = navigator.getGamepads()[this.gamepadIndex];
      if (gp) {
        // Cache buttons for state checking
        this.prevGamepadButtons = gp.buttons.map(b => b.pressed);
      }
    }
  }

  // Directional controls
  get isLeft(): boolean {
    const kb = this.keys['a'] || this.keys['arrowleft'];
    const gp = this.getGamepadAxis(0) < -0.3 || this.getGamepadButton(14); // Left stick or D-pad left
    return kb || gp;
  }

  get isRight(): boolean {
    const kb = this.keys['d'] || this.keys['arrowright'];
    const gp = this.getGamepadAxis(0) > 0.3 || this.getGamepadButton(15); // Left stick or D-pad right
    return kb || gp;
  }

  get isUp(): boolean {
    const kb = this.keys['w'] || this.keys['arrowup'];
    const gp = this.getGamepadAxis(1) < -0.3 || this.getGamepadButton(12); // Left stick up or D-pad up
    return kb || gp;
  }

  get isDown(): boolean {
    const kb = this.keys['s'] || this.keys['arrowdown'];
    const gp = this.getGamepadAxis(1) > 0.3 || this.getGamepadButton(13); // Left stick down or D-pad down
    return kb || gp;
  }

  // Attack checks (Press and Release detection)
  get isAttackPressed(): boolean {
    const kb = this.keys['j'] && !this.prevKeys['j'];
    // Standard layout: A/Cross button (usually 0) or X/Square (usually 2)
    const gp = (this.isGamepadButtonPressed(0) || this.isGamepadButtonPressed(2));
    return kb || gp;
  }

  get isJumpPressed(): boolean {
    const kb = this.keys['k'] && !this.prevKeys['k'];
    // Standard layout: B/Circle button (usually 1) or A/Cross (usually 0)
    const gp = this.isGamepadButtonPressed(1);
    return kb || gp;
  }

  get isSpecialPressed(): boolean {
    const kb = this.keys['l'] && !this.prevKeys['l'];
    // Standard layout: Y/Triangle button (usually 3)
    const gp = this.isGamepadButtonPressed(3);
    return kb || gp;
  }

  // Helper: check raw gamepad button state (held)
  private getGamepadButton(index: number): boolean {
    if (this.gamepadIndex === null) return false;
    const gp = navigator.getGamepads()[this.gamepadIndex];
    if (!gp || index >= gp.buttons.length) return false;
    return gp.buttons[index].pressed;
  }

  // Helper: check gamepad button newly pressed
  private isGamepadButtonPressed(index: number): boolean {
    if (this.gamepadIndex === null) return false;
    const gp = navigator.getGamepads()[this.gamepadIndex];
    if (!gp || index >= gp.buttons.length) return false;
    
    const currentlyPressed = gp.buttons[index].pressed;
    const previouslyPressed = this.prevGamepadButtons[index] || false;
    return currentlyPressed && !previouslyPressed;
  }

  // Helper: check stick position (-1.0 to 1.0)
  private getGamepadAxis(index: number): number {
    if (this.gamepadIndex === null) return 0;
    const gp = navigator.getGamepads()[this.gamepadIndex];
    if (!gp || index >= gp.axes.length) return 0;
    return gp.axes[index];
  }
}

export const input = new InputManager();
