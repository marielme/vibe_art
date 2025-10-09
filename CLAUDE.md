# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an interactive ML art gallery with 4 standalone p5.js experiments that use ml5.js pose detection and Tone.js audio synthesis. Created for the Vibe Shift Hackathon (October 2024).

## Running the Project

Start a local server from the repository root:

```bash
npx serve
```

Then navigate to `http://localhost:3000` to see the gallery landing page.

**Alternative:**
```bash
python -m http.server 8000  # Then visit http://localhost:8000
```

## Project Structure

```
/
├── index.html                 # Main gallery landing page (2x2 grid of experiments)
├── art1_dots/                 # Experiment 1: Basic particle system
│   ├── index.html
│   └── sketch.js
├── art2-voronoid/             # Experiment 2: Voronoi diagrams + Tone.js
│   ├── index.html
│   └── sketch.js
├── art3_painting/             # Experiment 3: Watercolor painting + Tone.js
│   ├── index.html
│   └── sketch.js
└── art4_claude_logo/          # Experiment 4: Logo particles + music + voronoi
    ├── index.html
    ├── sketch.js
    └── logo.png               # Claude logo asset
```

## Architecture

### Each Experiment is Self-Contained
- Each `artN_*/` folder is a complete, standalone p5.js application
- Each has its own `index.html` that loads CDN libraries and its local `sketch.js`
- No shared JavaScript between experiments - each is independent

### Technology Stack
- **p5.js** (v1.7.0): Canvas rendering and creative coding framework
- **ml5.js** (latest): Pose detection via bodyPose model
- **Tone.js** (v14.8.49): Audio synthesis (used in experiments 2, 3, 4)

### Common Pattern Across All Experiments
1. `preload()`: Load ml5.js bodyPose model (and assets like logo.png)
2. `setup()`: Initialize canvas, video capture, particles, and start pose detection
3. `draw()`: Main animation loop - draw background, update/render elements
4. `gotPoses(results)`: Callback that receives detected poses from ml5.js

### Pose Detection Flow
- Webcam video feed → ml5.bodyPose → detects 17 keypoints per person
- Keypoints include: nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles
- Each keypoint has `x, y, confidence` properties
- Video is horizontally flipped for mirror effect: `x = width - keypoint.x`

## Critical Implementation Details

### Asset Loading Paths
**IMPORTANT:** All asset paths in `sketch.js` must use relative paths with `./` prefix:
```javascript
// ✅ CORRECT
logoImg = loadImage('./logo.png');

// ❌ WRONG - will try to load from root
logoImg = loadImage('logo.png');
logoImg = loadImage('/art4_claude_logo/logo.png');
```

### Script Tag Paths in HTML
All `index.html` files must reference their local sketch.js with `./` prefix:
```html
<!-- ✅ CORRECT -->
<script src="./sketch.js"></script>

<!-- ❌ WRONG -->
<script src="sketch.js"></script>
```

### Music Integration (Experiments 2, 3, 4)
- Uses Tone.js for audio synthesis
- Must call `Tone.start()` on user interaction before audio plays
- Music parameters are pose-reactive:
  - Hand distance → tempo (60-180 BPM) and arpeggiator
  - Arm spread → reverb amount
  - Movement speed → various effects

### Experiment 4 Specific Architecture
This is the most complex experiment with multiple visual systems:

1. **Particles System**: Array of Particle objects with logo images
   - Each particle has position, velocity, acceleration, size, hue
   - Particles orbit around skeleton lines (30px target distance)
   - Logo images are tinted with HSB color and rotated based on velocity

2. **Voronoi Points**: 50 floating points that connect to nearby pose keypoints
   - Uses Perlin noise for organic movement
   - Attracted to nearby keypoints within 200px
   - Draw triangulated mesh with semi-transparent fills

3. **Music System**: Swan Lake theme with pose-reactive variations
   - Main melody synth, bass synth, reverb synth (arpeggiator)
   - 16-note melody loop with dynamic tempo

4. **Skeleton Visualization**: Lines and keypoints overlay

## Common Issues & Solutions

### 404 Errors on Assets
- Clear browser cache with hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Verify asset paths use `./` prefix in both HTML and JS
- Check browser Network tab to see exact failing URL

### Webcam Not Working
- Ensure HTTPS or localhost (browsers block camera on HTTP)
- Check browser permissions for camera access
- Good lighting improves pose detection quality

### Audio Not Playing
- `Tone.start()` must be called after user interaction
- Check browser console for audio context errors
- Some browsers block audio autoplay

## Iterative Development History

This project evolved through multiple iterations:
1. Basic dots/particles responding to pose
2. Voronoi diagrams connecting to keypoints
3. Watercolor painting effects with acceleration-based splatters
4. Full musical performance with Claude logo particles

Each experiment preserves a stage in this evolution, showing different creative approaches to the same pose detection input.
