# Interactive ML Art

An interactive art installation that uses your body movements to control a particle system. Built with p5.js for graphics and ml5.js for real-time pose detection.

## Features

- **Real-time pose detection** using ml5.js PoseNet
- **Reactive particle system** with 100 particles that respond to body movements
- **Visual skeleton overlay** showing detected joints and connections
- **Color-shifting particles** with trailing effects
- **Webcam-based interaction** - no additional hardware needed

## How to Run

### Option 1: Direct File Open
Simply open `index.html` in your web browser.

### Option 2: Local Server (Recommended)
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

## Usage

1. Allow camera access when prompted by your browser
2. Wait for the model to load (status will update)
3. Move your body to interact with the particles
4. Particles will repel from your detected body keypoints

## Technologies

- **p5.js** - Creative coding library for graphics
- **ml5.js** - Machine learning library (PoseNet model)
- **PoseNet** - Real-time human pose estimation

## Browser Compatibility

Works best in modern browsers with webcam support:
- Chrome (recommended)
- Firefox
- Edge
- Safari

## Privacy

All processing happens locally in your browser. No data is sent to external servers.
