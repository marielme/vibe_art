let video;
let bodyPose;
let poses = [];
let particles = [];
let statusText;
let pixelArtGrid = [];
let synth;
let musicStarted = false;
let melodicSequence;
let bassSynth;
let prevPosePositions = [];
let arpeggiator;
let arpSynth;

function preload() {
    // Load the bodyPose model
    bodyPose = ml5.bodyPose();
}

function setup() {
    createCanvas(windowWidth, windowHeight);

    // Create video capture
    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide();

    // Start detecting poses
    bodyPose.detectStart(video, gotPoses);

    statusText = select('#status');
    statusText.html('Model loaded! Click to start music and move to create art');

    // Setup Tone.js synthesizer for melody
    synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.1,
            decay: 0.3,
            sustain: 0.4,
            release: 1
        },
        volume: -8
    }).toDestination();

    // Bass synth for movement-triggered notes
    bassSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
            attack: 0.05,
            decay: 0.2,
            sustain: 0.3,
            release: 0.8
        },
        volume: -12
    }).toDestination();

    // Arpeggiator synth for hand distance control
    arpSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.2,
            release: 0.3
        },
        volume: -15
    }).toDestination();

    // Add reverb for atmosphere
    const reverb = new Tone.Reverb({
        decay: 3,
        wet: 0.3
    }).toDestination();
    synth.connect(reverb);
    bassSynth.connect(reverb);
    arpSynth.connect(reverb);

    // Initialize particles
    for (let i = 0; i < 2100; i++) {
        particles.push(new Particle());
    }

    // Initialize pixel art grid
    let pixelSize = 20;
    for (let x = 0; x < width; x += pixelSize) {
        for (let y = 0; y < height; y += pixelSize) {
            if (random() < 0.15) { // Only 15% of grid positions
                pixelArtGrid.push({
                    x: x,
                    y: y,
                    size: pixelSize,
                    updateCounter: floor(random(60)), // Stagger updates
                    active: random() > 0.5, // Start randomly active or inactive
                    activationTimer: floor(random(30, 120)) // Random interval for toggling
                });
            }
        }
    }
}

function gotPoses(results) {
    poses = results;
}

function drawPixelArt() {
    video.loadPixels();

    for (let pixel of pixelArtGrid) {
        // Random activation/deactivation
        pixel.activationTimer--;
        if (pixel.activationTimer <= 0) {
            pixel.active = !pixel.active; // Toggle state
            pixel.activationTimer = floor(random(30, 120)); // Reset timer with random interval
        }

        // Skip if not active
        if (!pixel.active) continue;

        // Update every N frames for variety
        pixel.updateCounter++;
        if (pixel.updateCounter > 30) {
            pixel.updateCounter = 0;
        }

        // Sample color from video at this position
        let videoX = floor(map(pixel.x, 0, width, 0, video.width));
        let videoY = floor(map(pixel.y, 0, height, 0, video.height));

        // Flip horizontally to match the mirrored display
        videoX = video.width - videoX;

        let index = (videoX + videoY * video.width) * 4;
        let r = video.pixels[index];
        let g = video.pixels[index + 1];
        let b = video.pixels[index + 2];

        // Calculate proximity to pose keypoints and skeleton
        let alpha = 40; // Default opacity
        let closestDist = Infinity;

        if (poses.length > 0) {
            let pose = poses[0];

            // Check distance to keypoints
            for (let keypoint of pose.keypoints) {
                if (keypoint.confidence > 0.2) {
                    let kx = width - keypoint.x;
                    let ky = keypoint.y;
                    let d = dist(pixel.x, pixel.y, kx, ky);
                    closestDist = min(closestDist, d);
                }
            }

            // Check distance to skeleton lines
            let connections = [
                ['nose', 'left_eye'], ['nose', 'right_eye'],
                ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
                ['left_shoulder', 'right_shoulder'],
                ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
                ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
                ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
                ['left_hip', 'right_hip'],
                ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
                ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
            ];

            for (let connection of connections) {
                let a = pose.keypoints.find(kp => kp.name === connection[0]);
                let b = pose.keypoints.find(kp => kp.name === connection[1]);

                if (a && b && a.confidence > 0.2 && b.confidence > 0.2) {
                    let ax = width - a.x;
                    let ay = a.y;
                    let bx = width - b.x;
                    let by = b.y;

                    // Distance to line segment
                    let lineStart = createVector(ax, ay);
                    let lineEnd = createVector(bx, by);
                    let pixelPos = createVector(pixel.x, pixel.y);
                    let d = distToSegment(pixelPos, lineStart, lineEnd);
                    closestDist = min(closestDist, d);
                }
            }

            // Increase opacity based on proximity to pose
            if (closestDist < 150) {
                alpha = map(closestDist, 0, 150, 200, 40);
            }
        }

        // Draw the pixel with dynamic opacity
        noStroke();
        fill(r, g, b, alpha);
        rect(pixel.x, pixel.y, pixel.size, pixel.size);
    }
}

function distToSegment(p, v, w) {
    let l2 = p5.Vector.dist(v, w);
    l2 = l2 * l2;
    if (l2 === 0) return p5.Vector.dist(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = constrain(t, 0, 1);
    let projection = createVector(
        v.x + t * (w.x - v.x),
        v.y + t * (w.y - v.y)
    );
    return p5.Vector.dist(p, projection);
}

function mousePressed() {
    // Start music on first user interaction
    if (!musicStarted) {
        Tone.start().then(() => {
            startMusic();
            musicStarted = true;
            statusText.html('Music started! Move to create art');
        });
    }
}

function startMusic() {
    // Swan Lake Theme - Main melody
    const swanLakeMelody = [
        // First phrase
        { note: 'B4', duration: '4n' },
        { note: 'A4', duration: '8n' },
        { note: 'G4', duration: '8n' },
        { note: 'A4', duration: '4n' },
        { note: 'G4', duration: '8n' },
        { note: 'F#4', duration: '8n' },
        { note: 'G4', duration: '4n' },
        { note: 'E4', duration: '4n' },
        // Second phrase
        { note: 'G4', duration: '4n' },
        { note: 'F#4', duration: '8n' },
        { note: 'E4', duration: '8n' },
        { note: 'F#4', duration: '4n' },
        { note: 'E4', duration: '8n' },
        { note: 'D4', duration: '8n' },
        { note: 'E4', duration: '4n' },
        { note: 'C4', duration: '4n' },
        // Repeat
        { note: 'B4', duration: '4n' },
        { note: 'A4', duration: '8n' },
        { note: 'G4', duration: '8n' },
        { note: 'A4', duration: '4n' },
        { note: 'G4', duration: '8n' },
        { note: 'F#4', duration: '8n' },
        { note: 'G4', duration: '2n' }
    ];

    let index = 0;
    melodicSequence = new Tone.Sequence((time) => {
        const { note, duration } = swanLakeMelody[index % swanLakeMelody.length];
        synth.triggerAttackRelease(note, duration, time);
        index++;
    }, Array(swanLakeMelody.length).fill(0).map((_, i) => i), '8n');

    melodicSequence.start(0);
    Tone.Transport.bpm.value = 100;
    Tone.Transport.start();
}

function draw() {
    // Solid background
    background(0);

    // Draw pixel art from video
    drawPixelArt();

    // Draw skeleton and keypoints
    drawKeypoints();
    drawSkeleton();

    // Update and display particles
    for (let particle of particles) {
        particle.update(poses);
        particle.display();
    }

    // Modulate music based on movement
    if (musicStarted && poses.length > 0) {
        let pose = poses[0];

        // Calculate movement speed
        let totalMovement = 0;
        let validKeypoints = 0;

        for (let i = 0; i < pose.keypoints.length; i++) {
            let keypoint = pose.keypoints[i];
            if (keypoint.confidence > 0.3) {
                if (prevPosePositions[i]) {
                    let dx = keypoint.x - prevPosePositions[i].x;
                    let dy = keypoint.y - prevPosePositions[i].y;
                    totalMovement += sqrt(dx * dx + dy * dy);
                    validKeypoints++;
                }
                prevPosePositions[i] = { x: keypoint.x, y: keypoint.y };
            }
        }

        if (validKeypoints > 0) {
            let avgMovement = totalMovement / validKeypoints;

            // EXAGGERATED tempo based on movement speed
            let newTempo = map(avgMovement, 0, 30, 60, 180);
            newTempo = constrain(newTempo, 60, 180);
            Tone.Transport.bpm.rampTo(newTempo, 0.2);

            // Trigger DRAMATIC bass notes on movements
            if (avgMovement > 5 && frameCount % 10 === 0) {
                let bassNotes = ['G1', 'C2', 'D2', 'E2', 'F2'];
                let randomBass = random(bassNotes);
                bassSynth.triggerAttackRelease(randomBass, '16n');
            }

            // Change synth brightness based on vertical position
            let avgY = 0;
            let yCount = 0;
            for (let keypoint of pose.keypoints) {
                if (keypoint.confidence > 0.3) {
                    avgY += keypoint.y;
                    yCount++;
                }
            }
            if (yCount > 0) {
                avgY /= yCount;
                // EXAGGERATED brightness - higher position = much brighter
                let brightness = map(avgY, 0, height, 5, 0.1);
                synth.set({ envelope: { decay: brightness, release: brightness * 2 } });
            }
        }

        // HAND DISTANCE ARPEGGIATOR
        let leftWrist = pose.keypoints.find(kp => kp.name === 'left_wrist');
        let rightWrist = pose.keypoints.find(kp => kp.name === 'right_wrist');

        if (leftWrist && rightWrist && leftWrist.confidence > 0.3 && rightWrist.confidence > 0.3) {
            let handDistance = dist(leftWrist.x, leftWrist.y, rightWrist.x, rightWrist.y);

            // Map hand distance to note range - wider hands = wider note intervals
            let noteRange = floor(map(handDistance, 50, 500, 1, 12));
            noteRange = constrain(noteRange, 1, 12);

            // Trigger arpeggio based on hand distance
            if (frameCount % 8 === 0) {
                // Base note from hand height
                let baseNoteIndex = floor(map((leftWrist.y + rightWrist.y) / 2, 0, height, 7, 0));
                baseNoteIndex = constrain(baseNoteIndex, 0, 7);

                let scaleNotes = ['C4', 'D4', 'E4', 'F#4', 'G4', 'A4', 'B4', 'C5'];
                let baseNote = scaleNotes[baseNoteIndex];

                // Create arpeggio pattern based on distance
                let arpNotes = [baseNote];
                for (let i = 1; i <= 3; i++) {
                    let nextIndex = (baseNoteIndex + i * noteRange) % scaleNotes.length;
                    arpNotes.push(scaleNotes[nextIndex]);
                }

                // Play the arpeggio
                let now = Tone.now();
                arpNotes.forEach((note, index) => {
                    arpSynth.triggerAttackRelease(note, '32n', now + index * 0.05);
                });
            }

            // EXTREME volume modulation based on hand spread
            let arpVolume = map(handDistance, 50, 500, -30, -8);
            arpSynth.volume.rampTo(arpVolume, 0.1);
        }

        // ARM SPREAD CONTROLS REVERB WET
        let leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
        let rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
        let leftElbow = pose.keypoints.find(kp => kp.name === 'left_elbow');
        let rightElbow = pose.keypoints.find(kp => kp.name === 'right_elbow');

        if (leftShoulder && rightShoulder && leftElbow && rightElbow) {
            if (leftShoulder.confidence > 0.3 && rightShoulder.confidence > 0.3 &&
                leftElbow.confidence > 0.3 && rightElbow.confidence > 0.3) {

                let armSpread = dist(leftElbow.x, leftElbow.y, rightElbow.x, rightElbow.y);
                let shoulderDist = dist(leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y);

                // Wide arms = more reverb
                if (shoulderDist > 0) {
                    let spreadRatio = armSpread / shoulderDist;
                    // EXAGGERATED reverb effect
                    let reverbWet = map(spreadRatio, 0.5, 3, 0.1, 0.95);
                    reverbWet = constrain(reverbWet, 0.1, 0.95);
                }
            }
        }
    }
}

function drawKeypoints() {
    for (let pose of poses) {
        for (let keypoint of pose.keypoints) {
            if (keypoint.confidence > 0.2) {
                let x = width - keypoint.x;
                let y = keypoint.y;

                // Draw glowing circles at keypoints
                noStroke();
                fill(255, 100, 200, 150);
                circle(x, y, 20);
                fill(255, 200, 255, 200);
                circle(x, y, 10);
            }
        }
    }
}

function drawSkeleton() {
    for (let pose of poses) {
        // Draw connections between keypoints
        let connections = [
            ['nose', 'left_eye'], ['nose', 'right_eye'],
            ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
            ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
        ];

        for (let connection of connections) {
            let a = pose.keypoints.find(kp => kp.name === connection[0]);
            let b = pose.keypoints.find(kp => kp.name === connection[1]);

            if (a && b && a.confidence > 0.2 && b.confidence > 0.2) {
                let ax = width - a.x;
                let ay = a.y;
                let bx = width - b.x;
                let by = b.y;

                strokeWeight(3);
                stroke(100, 255, 200, 200);
                line(ax, ay, bx, by);
            }
        }
    }
}

class Particle {
    constructor() {
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(0, 0);
        this.acc = createVector(0, 0);
        this.size = random(3, 15);
        // Smaller particles move faster, larger particles move slower
        this.maxSpeed = map(this.size, 3, 15, 6, 2);
        this.hue = random(360);
    }

    update(poses) {
        // Reset acceleration
        this.acc.mult(0);

        // Float around skeleton lines
        if (poses.length > 0) {
            let pose = poses[0];
            let closestDist = Infinity;
            let closestLinePoint = null;

            // Define skeleton connections
            let connections = [
                ['nose', 'left_eye'], ['nose', 'right_eye'],
                ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
                ['left_shoulder', 'right_shoulder'],
                ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
                ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
                ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
                ['left_hip', 'right_hip'],
                ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
                ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
            ];

            // Find closest point on any skeleton line
            for (let connection of connections) {
                let a = pose.keypoints.find(kp => kp.name === connection[0]);
                let b = pose.keypoints.find(kp => kp.name === connection[1]);

                if (a && b && a.confidence > 0.2 && b.confidence > 0.2) {
                    let ax = width - a.x;
                    let ay = a.y;
                    let bx = width - b.x;
                    let by = b.y;

                    // Find closest point on line segment to particle
                    let lineStart = createVector(ax, ay);
                    let lineEnd = createVector(bx, by);
                    let closestOnLine = this.closestPointOnLine(this.pos, lineStart, lineEnd);
                    let distance = p5.Vector.dist(this.pos, closestOnLine);

                    if (distance < closestDist) {
                        closestDist = distance;
                        closestLinePoint = closestOnLine;
                    }
                }
            }

            if (closestLinePoint) {
                let targetDist = 30; // Desired distance from line
                let force = p5.Vector.sub(closestLinePoint, this.pos);
                let distance = force.mag();

                if (distance > targetDist + 10) {
                    // Move towards the line
                    force.normalize();
                    force.mult(0.5);
                    this.acc.add(force);
                } else if (distance < targetDist - 10) {
                    // Move away from the line
                    force.normalize();
                    force.mult(-0.5);
                    this.acc.add(force);
                }

                // Add tangential movement along the line
                let tangent = createVector(-force.y, force.x);
                tangent.normalize();
                tangent.mult(0.3);
                this.acc.add(tangent);

                // Add slight random jitter
                this.acc.add(createVector(random(-0.3, 0.3), random(-0.3, 0.3)));
            }
        } else {
            // Random movement when no pose detected
            this.acc.add(createVector(random(-0.2, 0.2), random(-0.2, 0.2)));
        }

        // Update velocity and position
        this.vel.add(this.acc);
        this.vel.limit(this.maxSpeed);
        this.pos.add(this.vel);

        // Wrap around edges
        if (this.pos.x < 0) this.pos.x = width;
        if (this.pos.x > width) this.pos.x = 0;
        if (this.pos.y < 0) this.pos.y = height;
        if (this.pos.y > height) this.pos.y = 0;

        // Slowly change hue
        this.hue = (this.hue + 0.5) % 360;
    }

    closestPointOnLine(point, lineStart, lineEnd) {
        let line = p5.Vector.sub(lineEnd, lineStart);
        let len = line.mag();
        line.normalize();

        let v = p5.Vector.sub(point, lineStart);
        let d = v.dot(line);
        d = constrain(d, 0, len);

        return p5.Vector.add(lineStart, p5.Vector.mult(line, d));
    }

    display() {
        colorMode(HSB);
        noStroke();
        fill(this.hue, 80, 100, 0.8);
        circle(this.pos.x, this.pos.y, this.size);
        colorMode(RGB);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    video.size(width, height);
}
