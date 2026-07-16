# ☕ MEETING DISORDER
### 🎮 Retro 2.5D Office Hack-and-Slash Beat-'Em-Up • Company Hackathon • Team Alpha

Welcome to **Meeting Disorder**, an action-packed 2.5D beat-'em-up game created entirely by **Team Alpha** for our company competition! Step into the corporate brawler ring, select your tech role, and fight your way through the dreads of the office floor—culminating in a major showdown with a rogue, high-pressure Coffee Machine Boss.

The game is built using **Vite + TypeScript + HTML5 Canvas** as a zero-external-asset, high-performance web-playable demo. Plays instantly in any web browser with **Keyboard** or **Gamepad Controller**!

---

## 🚀 Play Now (Quick Start)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
*Your browser will automatically open the game at `http://localhost:3000` with hot reloading enabled!*

### 3. Compile for Production
```bash
npm run build
```
*This compiles your code into `/dist`, generating an ultra-lightweight client-side package under 50KB total.*

---

## 🕹️ Controls

| Action | ⌨️ Keyboard Scheme | 🎮 Gamepad / Controller |
| :--- | :--- | :--- |
| **Move (2.5D)** | `W` `A` `S` `D` or `▲` `▼` `◀` `▶` | Left Joystick or D-Pad |
| **Attack (3-Hit Combo)** | `J` | `A` or `X` (Button 0/2) |
| **Jump** | `K` | `B` or `O` (Button 1) |
| **Special Ultimate** | `L` *(Costs 40% Coffee)* | `Y` or `△` (Button 3) |

---

## 👥 Meet Your Corporate Fighters

Select your corporate champion, each equipped with custom gameplay stats and ultimate area-of-effect abilities:

* **👨‍💻 The Developer**:
  * **Weapon**: Ergonomic Mechanical Keyboard (swings with sparking blue code lines).
  * **Ultimate Moves**: *Merge Conflict* — summons a cascade of green Matrix code rain, wiping out all enemies in vicinity.
  * **Stats**: High Health (110 HP), Balanced Speed.
* **👩‍💼 The Product Manager (PM)**:
  * **Weapon**: High-volume Megaphone.
  * **Ultimate Moves**: *Scope Creep* — emits expanding shockwaves of golden sound ("SYNERGY!"), throwing enemies back with continuous ticks of damage.
  * **Stats**: Very High Speed, Lower Health (90 HP).
* **🎨 The Designer**:
  * **Weapon**: Giant Digital Stylus Brush.
  * **Ultimate Moves**: *Pixel Perfect Redesign* — slashes the canvas with glowing neon rainbow sweeps, dealing double critical slice damage.
  * **Stats**: Balanced Stats, High Damage Combos.

---

## 👾 The Corporate Adversaries

* **👔 The Micro-Manager**: Fast-moving bossy supervisors swinging clipboard hurtboxes. They drop hot coffee cups upon defeat!
* **🧟 The Zoom Zombie**: Slow-moving glitched remote employees that attack in tattered business outfits.
* **☕ The Coffee Machine Beast (Boss)**: A mechanical appliance gone rogue. It charges forward with steam jets, spit-fires burning espresso pools onto the floor, and acts as the ultimate stage challenge.

---

## 🛠️ Tech Stack & Features

* **HTML5 Canvas Engine**: Custom rendering engine built entirely from scratch with TypeScript, running at a smooth 60 frames per second.
* **Authentic 2.5D Depth-Sorting**: Physics checks overlap on $x$, $y$ (depth), and $z$ (height) planes—objects further back are drawn behind objects closer to the foreground automatically.
* **Code-Synthesized 8-Bit Audio**: Synthesizes sound effects (swishes, punches, explosions) and dynamic high-tempo action background music on-the-fly using the **Web Audio API** (zero asset download delay!).
* **Rich Particle Physics & Juice**: Featuring floating damage figures, spilling brown coffee, flying white paperwork, and screen-shake on impact.
* **Sleek CRT Cabinet Bezel**: Complete with pixelated image-rendering, glowing scanlines, and an interactive glassmorphic start/selection overlay screen.

---

## 🌐 Instant Hosting (GitHub Pages)

To host your demo so judges and colleagues can play with a single click, you can deploy your `/dist` build directly to GitHub Pages for free:

1. **Enable GitHub Pages**:
   Go to your repository settings on GitHub.com: **Settings > Pages**. Under "Build and deployment", set **Source** to `GitHub Actions`.
2. **Add Workflow File**:
   Create a file `.github/workflows/deploy.yml` in your repository:
   ```yaml
   name: Deploy Game
   on:
     push:
       branches: [main]
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with:
             path: dist
         - uses: actions/deploy-pages@v4
   ```
3. **Commit & Push**: Once pushed, your game is live globally at `https://danielblaski-veeva.github.io/meeting-disorder/`!

---

## 📁 Repository Structure

```text
meeting-disorder/
├── index.html               # Main page container and controller layout
├── package.json             # Build scripts and project dependencies
├── tsconfig.json            # TypeScript type-checking parameters
├── vite.config.ts           # Development server configurations
└── src/
    ├── main.ts              # Game setup, loops, background renderers, and spawner AI
    ├── types.ts             # Global interfaces and schemas
    ├── input.ts             # Dual Keyboard + Gamepad polling managers
    ├── entities/
    │   ├── Entity.ts        # Physical 2.5D baseline class (coordinates, shadows, gravity)
    │   ├── Player.ts        # Character stats, combo timing buffers, and procedural drawings
    │   └── Enemy.ts         # Behavior state machines for Zoom Zombies, Managers, and Boss
    ├── system/
    │   ├── Collision.ts     # Hitbox vs Hurtbox 2.5D boundary detectors
    │   ├── Particle.ts      # Visual effects emitters (sparks, dust, papers, coffee spills)
    │   └── Sound.ts         # Procedural chiptunes and audio synth pipelines
    └── ui/
        └── HUD.ts           # Static HUD canvas widgets (HP, Coffee bars, Combo counters, Boss)
```
