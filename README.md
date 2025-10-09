# Interactive ML Art Gallery - Vibe Shift Hackathon

A collection of 4 interactive art experiments that transform your body into a conductor of digital energy. Using real-time pose detection, your movements create unique artistic expressions ranging from geometric patterns to musical interactions.

## 🎨 Art Experiments

1. **Experiment 1: Dots** - Simple particle system with flowing dots and trails
2. **Experiment 2: Voronoi** - Geometric patterns and voronoi diagrams
3. **Experiment 3: Painting** - Watercolor-inspired effects with paint splatters
4. **Experiment 4: Claude Logo Symphony** - Logo particles with Swan Lake musical variations

## What You Need to Install

**Nothing!** This project runs entirely in your web browser. All libraries are loaded via CDN:
- p5.js (graphics)
- ml5.js (pose detection)
- Tone.js (music synthesis)

## How to Start the Project

### Option 1: Direct File Open (Easiest)
Simply open `index.html` in your web browser to see the art gallery menu, then select any experiment.

### Option 2: Local Server (Recommended for best performance)
Using npx serve:
```bash
npx serve
```
Then open your browser to the URL shown (typically `http://localhost:3000`).

### Option 3: Python Server
```bash
python -m http.server 8000
```
Then navigate to `http://localhost:8000`.

## How to Interact

### General Instructions (All Experiments)
1. **Allow camera access** when prompted by your browser
2. **Wait** for the pose detection model to load (status updates on screen)
3. **Move your body** to create art - each experiment responds differently!

### Experiment 4 (Claude Logo Symphony) - Specific Features
- **Particles** (Claude logo shapes) follow your skeleton and change colors
- **Music** plays Swan Lake theme with variations based on your movements:
  - Hand distance controls arpeggiator
  - Arm spread controls reverb
  - Movement speed affects tempo (60-180 BPM)
- **Voronoi points** with logo images connect to your pose
- **Experiment** with different movements - dance, jump, stretch!

## Technical Requirements

- **Web browser** with webcam support (Chrome recommended)
- **Microphone** not needed
- **Sound** output for music
- **Large projection size** recommended for immersive experience
- Works best with good lighting for pose detection

## Description

This gallery explores the intersection of body movement, generative art, and reactive music. The project showcases an iterative creative process, documenting the evolution from simple particle systems to complex musical interactions.

**The Creative Journey:**
- Started with basic particle systems and dots
- Evolved into geometric Voronoi diagrams
- Experimented with watercolor painting aesthetics
- Culminated in a musical performance piece with Claude AI logo particles and Swan Lake theme

Each experiment demonstrates different aspects of making ML accessible and playful - turning pose detection into an instrument for spontaneous digital performance art.

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Privacy

All processing happens locally in your browser. No data is sent to external servers.
