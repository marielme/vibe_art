let video;
let bodyPose;
let poses = [];
let statusText;
let synth;
let musicStarted = false;
let melodicSequence;
let bassSynth;
let prevPosePositions = [];
let arpSynth;
let trailPoints = [];
let watercolorDrops = [];
let backgroundBlotches = [];
let paintSplatters = [];
let prevKeypointPositions = [];

function preload() {
    // Load the bodyPose model
    bodyPose = ml5.bodyPose();
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 255);

    // Create video capture
    video = createCapture(VIDEO);
    video.size(width, height);
    video.hide();

    // Start detecting poses
    bodyPose.detectStart(video, gotPoses);

    statusText = select('#status');
    if (statusText) {
        statusText.html('Model loaded! Click to start music and move to create art');
    }

    // Set initial background - deep indigo/navy
    colorMode(RGB);
    background(15, 10, 35);

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

    // Initialize trail points for each major keypoint
    for (let i = 0; i < 17; i++) { // 17 keypoints in COCO model
        trailPoints[i] = [];
        prevKeypointPositions[i] = null;
    }

    // Create random background blotches
    for (let i = 0; i < 15; i++) {
        backgroundBlotches.push({
            x: random(width),
            y: random(height),
            size: random(80, 250),
            hue: random(200, 280),
            sat: random(20, 50),
            bri: random(30, 60),
            alpha: random(10, 30)
        });
    }
}

function gotPoses(results) {
    poses = results;
}

function mousePressed() {
    // Start music on first user interaction
    if (!musicStarted) {
        Tone.start().then(() => {
            startMusic();
            musicStarted = true;
            if (statusText) {
                statusText.html('Music started! Move to create art');
            }
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
    blendMode(BLEND);

    // Update and draw watercolor drips
    updateWatercolorDrops();

    // Update and draw paint splatters
    updatePaintSplatters();

    // Draw brush art based on poses
    if (poses.length > 0) {
        drawBrushArt();
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

function updateWatercolorDrops() {
    // Update existing drops
    for (let i = watercolorDrops.length - 1; i >= 0; i--) {
        let drop = watercolorDrops[i];

        // Drip downward with gravity
        drop.y += drop.speed;
        drop.speed += 0.1; // Gravity
        drop.x += random(-0.5, 0.5); // Slight horizontal drift

        // Fade and expand slightly as it drips
        drop.alpha -= 0.5;
        drop.size += 0.1;

        // Remove if off screen or fully transparent
        if (drop.y > height || drop.alpha <= 0) {
            watercolorDrops.splice(i, 1);
            continue;
        }

        // Draw the drip
        noStroke();
        fill(drop.hue, drop.sat, drop.bri, drop.alpha);
        ellipse(drop.x, drop.y, drop.size * 0.5, drop.size * 1.5);

        // Leave trail as it falls
        fill(drop.hue, drop.sat, drop.bri, drop.alpha * 0.3);
        ellipse(drop.x, drop.y - 5, drop.size * 0.3, drop.size);
    }
}

function updatePaintSplatters() {
    // Update existing splatters
    for (let i = paintSplatters.length - 1; i >= 0; i--) {
        let splatter = paintSplatters[i];

        // Move with velocity
        splatter.x += splatter.vx;
        splatter.y += splatter.vy;

        // Apply gravity
        splatter.vy += 0.15;

        // Air resistance
        splatter.vx *= 0.98;
        splatter.vy *= 0.98;

        // Fade out
        splatter.alpha -= 1.5;

        // Remove if fully transparent or off screen
        if (splatter.alpha <= 0 || splatter.y > height + 100 || splatter.x < -100 || splatter.x > width + 100) {
            paintSplatters.splice(i, 1);
            continue;
        }

        // Draw splatter
        noStroke();
        fill(splatter.hue, splatter.sat, splatter.bri, splatter.alpha);

        // Draw main splatter blob
        circle(splatter.x, splatter.y, splatter.size);

        // Add smaller droplets around it
        for (let j = 0; j < 3; j++) {
            let offsetX = random(-splatter.size, splatter.size);
            let offsetY = random(-splatter.size, splatter.size);
            fill(splatter.hue, splatter.sat, splatter.bri, splatter.alpha * 0.6);
            circle(splatter.x + offsetX, splatter.y + offsetY, splatter.size * random(0.2, 0.5));
        }
    }
}

function drawBrushArt() {
    let pose = poses[0];

    // Update trail points and draw flowing strokes
    for (let i = 0; i < pose.keypoints.length; i++) {
        let keypoint = pose.keypoints[i];

        if (keypoint.confidence > 0.4) {
            let x = width - keypoint.x;
            let y = keypoint.y;

            // Calculate acceleration/velocity
            if (prevKeypointPositions[i]) {
                let dx = x - prevKeypointPositions[i].x;
                let dy = y - prevKeypointPositions[i].y;
                let speed = sqrt(dx * dx + dy * dy);

                // If moving fast, throw paint!
                if (speed > 15) {
                    let numSplatters = floor(map(speed, 15, 50, 2, 12));

                    for (let j = 0; j < numSplatters; j++) {
                        // Calculate direction perpendicular to movement
                        let angle = atan2(dy, dx) + random(-PI/3, PI/3);
                        let throwSpeed = map(speed, 15, 50, 3, 15);

                        // More artistic color palette - warm and cool colors
                        let colorPalettes = [
                            { hue: random(0, 30), sat: random(85, 100), bri: random(90, 100) },      // Hot reds/oranges
                            { hue: random(30, 60), sat: random(80, 95), bri: random(85, 100) },      // Yellows/golds
                            { hue: random(280, 320), sat: random(75, 95), bri: random(85, 100) },    // Magentas/pinks
                            { hue: random(160, 200), sat: random(70, 90), bri: random(80, 95) },     // Cyans/turquoise
                            { hue: random(240, 280), sat: random(80, 100), bri: random(85, 100) }    // Purples/violets
                        ];

                        let chosenColor = random(colorPalettes);

                        paintSplatters.push({
                            x: x,
                            y: y,
                            vx: cos(angle) * throwSpeed + random(-2, 2),
                            vy: sin(angle) * throwSpeed + random(-2, 2),
                            size: random(3, 12),
                            hue: chosenColor.hue,
                            sat: chosenColor.sat,
                            bri: chosenColor.bri,
                            alpha: random(180, 255)
                        });
                    }
                }
            }

            prevKeypointPositions[i] = { x: x, y: y };

            // Add to trail
            trailPoints[i].push({ x: x, y: y, time: frameCount });

            // Keep only recent points
            if (trailPoints[i].length > 30) {
                trailPoints[i].shift();
            }

            // Draw trails with flowing lines
            if (trailPoints[i].length > 2) {
                // Artistic color palette for trails
                let colorChoice = floor(random(5));
                let hue, sat, bri, alpha;

                // Hands get vibrant colors and thicker lines
                if (keypoint.name.includes('wrist') || keypoint.name.includes('elbow')) {
                    // Vibrant warm colors for hands
                    if (colorChoice < 2) {
                        hue = random(0, 40); // Reds/oranges
                        sat = random(85, 100);
                    } else if (colorChoice < 4) {
                        hue = random(280, 330); // Magentas/pinks
                        sat = random(80, 95);
                    } else {
                        hue = random(160, 200); // Cyans
                        sat = random(75, 90);
                    }
                    bri = random(90, 100);
                    alpha = 200;
                    strokeWeight(random(8, 20));

                    // Create watercolor drips from hands randomly
                    if (random() < 0.15) {
                        watercolorDrops.push({
                            x: x,
                            y: y,
                            speed: random(1, 3),
                            size: random(8, 20),
                            hue: hue,
                            sat: sat,
                            bri: bri,
                            alpha: 150
                        });
                    }
                }
                // Head gets ethereal colors
                else if (keypoint.name.includes('nose') || keypoint.name.includes('eye')) {
                    hue = random(240, 280); // Purples/violets
                    sat = random(60, 80);
                    bri = random(80, 95);
                    alpha = 120;
                    strokeWeight(random(15, 30));
                }
                // Body gets warm golds and yellows
                else {
                    hue = random(30, 60); // Yellows/golds
                    sat = random(75, 90);
                    bri = random(85, 100);
                    alpha = 140;
                    strokeWeight(random(5, 12));
                }

                stroke(hue, sat, bri, alpha);
                noFill();

                // Draw flowing bezier curves through recent trail points
                beginShape();
                for (let j = 0; j < trailPoints[i].length; j++) {
                    let p = trailPoints[i][j];
                    curveVertex(p.x, p.y);

                    // Random drips from the trail
                    if (random() < 0.02) {
                        watercolorDrops.push({
                            x: p.x,
                            y: p.y,
                            speed: random(0.5, 2),
                            size: random(5, 15),
                            hue: hue,
                            sat: sat,
                            bri: bri,
                            alpha: alpha * 0.8
                        });
                    }
                }
                endShape();
            }
        }
    }

    // Draw connections with flowing lines
    let connections = [
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'],
        ['right_elbow', 'right_wrist'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'],
        ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'],
        ['right_knee', 'right_ankle']
    ];

    // Draw skeleton with soft spray effect
    if (frameCount % 2 === 0) {
        for (let connection of connections) {
            let a = pose.keypoints.find(kp => kp.name === connection[0]);
            let b = pose.keypoints.find(kp => kp.name === connection[1]);

            if (a && b && a.confidence > 0.3 && b.confidence > 0.3) {
                let ax = width - a.x;
                let ay = a.y;
                let bx = width - b.x;
                let by = b.y;

                // Soft spray effect for skeleton - golden/orange glow
                strokeWeight(random(10, 18));
                stroke(random(30, 50), random(70, 85), random(75, 90), 60);
                line(ax, ay, bx, by);
            }
        }
    }

    // Draw keypoints as glowing circles
    for (let keypoint of pose.keypoints) {
        if (keypoint.confidence > 0.5 && frameCount % 4 === 0) {
            let x = width - keypoint.x;
            let y = keypoint.y;

            // Wrists get special bright effect - hot colors
            if (keypoint.name.includes('wrist')) {
                noStroke();
                // Outer glow - warm color
                fill(random(0, 40), random(85, 100), random(90, 100), 180);
                circle(x, y, random(15, 35));
                // Inner bright spot - complementary color
                fill(random(280, 320), random(80, 95), random(95, 100), 150);
                circle(x, y, random(8, 18));
            }
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    video.size(width, height);
}
