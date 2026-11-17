// CANTING: keyboard and mouse input.
// Each key and the mouse button carry three states: held, pressed this frame,
// and released this frame. The game loop calls endFrame() after every update
// so "pressed this frame" never sticks. Listeners only set flags; the update
// step reads them, so input timing never depends on event timing.

export const TOOL_WAX = 0;
export const TOOL_ERASE = 1;
export const TOOL_FREEZE = 2;

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseHeld = false;
    this.mousePressed = false;
    this.mouseReleased = false;
    this.mouseSeen = false;

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      if (!this.held.has(event.code)) this.pressed.add(event.code);
      this.held.add(event.code);
      if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      this.held.delete(event.code);
      this.released.add(event.code);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.mouseHeld = false;
    });

    canvas.addEventListener('mousedown', (event) => {
      this.mousePressed = true;
      this.mouseHeld = true;
      this.trackMouse(event);
    });
    window.addEventListener('mouseup', () => {
      if (this.mouseHeld) this.mouseReleased = true;
      this.mouseHeld = false;
    });
    canvas.addEventListener('mousemove', (event) => this.trackMouse(event));
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  // Convert a pointer event to logical canvas coordinates.
  trackMouse(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.mouseX = (event.clientX - rect.left) * scaleX;
    this.mouseY = (event.clientY - rect.top) * scaleY;
    this.mouseSeen = true;
  }

  isHeld(code) {
    return this.held.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  wasReleased(code) {
    return this.released.has(code);
  }

  // Clear all per-frame flags. Call once at the end of every loop iteration.
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mousePressed = false;
    this.mouseReleased = false;
  }
}
