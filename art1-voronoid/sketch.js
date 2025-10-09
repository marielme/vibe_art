let video;
let bodyPose;
let poses = [];
let particles = [];
let statusText;
let voronoiPoints = [];
let pixelArtGrid = [];
let portals = [];

// Music variables
let synth;
let bassSynth;
let reverbSynth;
let isPlaying = false;
let melody;
let melodyIndex = 0;
let lastNoteTime = 0;

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
    statusText.html('Model loaded! Move to create art');

    // Initialize particles
    for (let i = 0; i < 2100; i++) {
        particles.push(new Particle());
    }

    // Initialize voronoi points (fewer for better performance)
    for (let i = 0; i < 50; i++) {
        voronoiPoints.push({
            x: random(width),
            y: random(height),
            vx: random(-1, 1),
            vy: random(-1, 1),
            noiseOffsetX: random(1000),
            noiseOffsetY: random(1000),
            noiseSpeed: random(0.002, 0.005)
        });
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
                    updateCounter: floor(random(60)) // Stagger updates
                });
            }
        }
    }

    // Setup audio - Swan Lake theme
    setupMusic();
}

function setupMusic() {
    // Create reverb effect
    const reverb = new Tone.Reverb({
        decay: 3,
        wet: 0.3
    }).toDestination();

    // Main melody synth
    synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.05,
            decay: 0.2,
            sustain: 0.3,
            release: 1
        }
    }).connect(reverb);

    // Bass synth
    bassSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
            attack: 0.1,
            decay: 0.3,
            sustain: 0.4,
            release: 1.2
        }
    }).connect(reverb);

    // Reverb synth for hand distance arpeggiator
    reverbSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0.1,
            release: 0.5
        }
    }).connect(reverb);

    // Swan Lake main theme melody (simplified)
    melody = [
        'E4', 'F#4', 'G4', 'A4', 'B4', 'C5', 'B4', 'A4',
        'G4', 'F#4', 'E4', 'D4', 'E4', 'F#4', 'G4', 'A4'
    ];
}

function gotPoses(results) {
    poses = results;
}

function drawPixelArt() {
    video.loadPixels();

    for (let pixel of pixelArtGrid) {
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

function draw() {
    // Solid background
    background(0);

    // Draw pixel art from video
    drawPixelArt();

    // Draw voronoi diagram
    drawVoronoi();

    // Draw skeleton and keypoints
    drawKeypoints();
    drawSkeleton();

    // Update and display particles
    for (let particle of particles) {
        particle.update(poses);
        particle.display();
    }

    // Play music with pose-reactive variations
    playMusic();
}

function playMusic() {
    // Start audio context on first user interaction
    if (!isPlaying && Tone.context.state !== 'running') {
        Tone.start();
        isPlaying = true;
    }

    if (!isPlaying) return;

    // Play melody notes based on time
    let now = millis();
    let tempo = 120; // Base tempo

    // Adjust tempo based on movement speed
    if (poses.length > 0) {
        let pose = poses[0];
        let leftHand = pose.keypoints.find(kp => kp.name === 'left_wrist');
        let rightHand = pose.keypoints.find(kp => kp.name === 'right_wrist');

        // Dynamic tempo based on hand distance (60-180 BPM)
        if (leftHand && rightHand && leftHand.confidence > 0.3 && rightHand.confidence > 0.3) {
            let handDist = dist(leftHand.x, leftHand.y, rightHand.x, rightHand.y);
            tempo = map(handDist, 50, 500, 60, 180);
            tempo = constrain(tempo, 60, 180);

            // Hand distance arpeggiator
            if (frameCount % 10 === 0) {
                let arpNote = map(handDist, 50, 500, 0, melody.length - 1);
                arpNote = floor(constrain(arpNote, 0, melody.length - 1));
                reverbSynth.triggerAttackRelease(melody[arpNote], '16n');
            }
        }

        // Arm spread controls reverb
        let leftShoulder = pose.keypoints.find(kp => kp.name === 'left_shoulder');
        let rightShoulder = pose.keypoints.find(kp => kp.name === 'right_shoulder');
        if (leftShoulder && rightShoulder && leftHand && rightHand) {
            let shoulderDist = dist(leftShoulder.x, leftShoulder.y, rightShoulder.x, rightShoulder.y);
            let armSpread = dist(leftHand.x, leftHand.y, rightHand.x, rightHand.y);
            if (armSpread > shoulderDist * 1.5) {
                // Arms are spread - more reverb
            }
        }
    }

    let beatInterval = (60 / tempo) * 1000; // ms per beat

    if (now - lastNoteTime > beatInterval) {
        // Play next melody note
        synth.triggerAttackRelease(melody[melodyIndex], '8n');

        // Play bass note occasionally
        if (melodyIndex % 4 === 0) {
            let bassNote = melody[melodyIndex].replace(/\d/, '2'); // Drop octave
            bassSynth.triggerAttackRelease(bassNote, '4n');
        }

        melodyIndex = (melodyIndex + 1) % melody.length;
        lastNoteTime = now;
    }
}

function drawVoronoi() {
    // Update voronoi points with pose interaction
    updateVoronoiPoints();

    // Draw filled triangles first
    noStroke();
    for (let i = 0; i < voronoiPoints.length; i++) {
        for (let j = i + 1; j < voronoiPoints.length; j++) {
            let d1 = dist(voronoiPoints[i].x, voronoiPoints[i].y,
                         voronoiPoints[j].x, voronoiPoints[j].y);
            if (d1 < 250) {
                // Find a third point to make a triangle
                for (let k = j + 1; k < voronoiPoints.length; k++) {
                    let d2 = dist(voronoiPoints[j].x, voronoiPoints[j].y,
                                 voronoiPoints[k].x, voronoiPoints[k].y);
                    let d3 = dist(voronoiPoints[i].x, voronoiPoints[i].y,
                                 voronoiPoints[k].x, voronoiPoints[k].y);

                    if (d2 < 250 && d3 < 250) {
                        // Draw filled triangle
                        fill(255, 255, 255, 15);
                        triangle(voronoiPoints[i].x, voronoiPoints[i].y,
                                voronoiPoints[j].x, voronoiPoints[j].y,
                                voronoiPoints[k].x, voronoiPoints[k].y);
                    }
                }
            }
        }
    }

    // Draw voronoi edges on top
    stroke(255, 255, 255, 60);
    strokeWeight(2);
    noFill();

    // Draw lines between nearby voronoi points
    for (let i = 0; i < voronoiPoints.length; i++) {
        for (let j = i + 1; j < voronoiPoints.length; j++) {
            let d = dist(voronoiPoints[i].x, voronoiPoints[i].y,
                        voronoiPoints[j].x, voronoiPoints[j].y);
            if (d < 250) {
                let alpha = map(d, 0, 250, 120, 10);
                stroke(255, 255, 255, alpha);
                line(voronoiPoints[i].x, voronoiPoints[i].y,
                     voronoiPoints[j].x, voronoiPoints[j].y);
            }
        }
    }

    // Draw voronoi points
    for (let point of voronoiPoints) {
        fill(200, 200, 200, 255);
        noStroke();
        circle(point.x, point.y, 12);
    }

    // Connect voronoi points to nearby pose keypoints
    if (poses.length > 0) {
        for (let point of voronoiPoints) {
            for (let keypoint of poses[0].keypoints) {
                if (keypoint.confidence > 0.3) {
                    let kx = width - keypoint.x;
                    let ky = keypoint.y;
                    let d = dist(point.x, point.y, kx, ky);

                    // Only connect if within range
                    if (d < 200) {
                        let alpha = map(d, 0, 200, 150, 10);
                        stroke(255, 255, 255, alpha);
                        strokeWeight(2);
                        line(point.x, point.y, kx, ky);
                    }
                }
            }
        }
    }
}

function updateVoronoiPoints() {
    for (let point of voronoiPoints) {
        // Smooth Perlin noise-based movement
        let noiseX = noise(point.noiseOffsetX) * 2 - 1;
        let noiseY = noise(point.noiseOffsetY) * 2 - 1;

        point.vx += noiseX * 0.1;
        point.vy += noiseY * 0.1;

        // Increment noise offsets for continuous smooth movement
        point.noiseOffsetX += point.noiseSpeed;
        point.noiseOffsetY += point.noiseSpeed;

        point.x += point.vx;
        point.y += point.vy;

        // Bounce off edges
        if (point.x < 0 || point.x > width) point.vx *= -1;
        if (point.y < 0 || point.y > height) point.vy *= -1;

        // Strong attraction to pose keypoints
        if (poses.length > 0) {
            let closestDist = Infinity;
            let closestKeypoint = null;

            for (let keypoint of poses[0].keypoints) {
                if (keypoint.confidence > 0.2) {
                    let kx = width - keypoint.x;
                    let ky = keypoint.y;
                    let d = dist(point.x, point.y, kx, ky);

                    if (d < closestDist) {
                        closestDist = d;
                        closestKeypoint = {x: kx, y: ky};
                    }
                }
            }

            if (closestKeypoint && closestDist < 200) {
                // Attract to nearest keypoint
                let angle = atan2(closestKeypoint.y - point.y, closestKeypoint.x - point.x);
                let force = map(closestDist, 0, 200, 0.5, 0.05);
                point.vx += cos(angle) * force;
                point.vy += sin(angle) * force;
            }
        }

        // Damping
        point.vx *= 0.95;
        point.vy *= 0.95;

        // Constrain velocity
        let speed = sqrt(point.vx * point.vx + point.vy * point.vy);
        if (speed > 3) {
            point.vx = (point.vx / speed) * 3;
            point.vy = (point.vy / speed) * 3;
        }

        // Constrain position
        point.x = constrain(point.x, 0, width);
        point.y = constrain(point.y, 0, height);
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
