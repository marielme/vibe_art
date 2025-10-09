# Interactive ML Art - Vibe Shift Hackathon

An interactive art installation that transforms your body into a conductor of digital energy. Using real-time pose detection, your movements create swirling particles, electric portals, and generative soundscapes inspired by Swan Lake.

## What You Need to Install

**Nothing!** This project runs entirely in your web browser. All libraries are loaded via CDN:
- p5.js (graphics)
- ml5.js (pose detection)
- Tone.js (music synthesis)

## How to Start the Project

### Option 1: Direct File Open (Easiest)
Simply open `index.html` in your web browser.

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

1. **Allow camera access** when prompted by your browser
2. **Wait** for the pose detection model to load (status updates on screen)
3. **Move your body** to create art:
   - **Particles** (Claude logo shapes) follow your skeleton and change colors
   - **Portals** appear randomly - hit them with your hands, feet, elbows, knees, or head to send them flying off screen with physics
   - **Music** plays Swan Lake theme with variations based on your movements:
     - Hand distance controls arpeggiator
     - Arm spread controls reverb
     - Movement speed affects tempo (60-180 BPM)
   - **Video pixels** from your webcam appear as pixel art, more visible near your body

4. **Experiment** with different movements - dance, jump, stretch, punch the portals!

## Technical Requirements

- **Web browser** with webcam support (Chrome recommended)
- **Microphone** not needed
- **Sound** output for music
- **Large projection size** recommended for immersive experience
- Works best with good lighting for pose detection

## Description

This work explores the intersection of body movement, generative art, and reactive music. Inspired by the fluidity of Swan Lake and the energy of electric portals, the piece transforms the performer into both artist and instrument.

The prompt journey evolved from simple Voronoi diagrams to watercolor-like particle systems, finally arriving at this portal-hitting game aesthetic with Claude AI logo particles. The music dynamically responds to body positioning, creating unique performances each time.

The artistic practice centers on making ML accessible and playful - turning pose detection into an instrument for spontaneous digital performance art.

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge
- Safari

## Privacy

All processing happens locally in your browser. No data is sent to external servers.
