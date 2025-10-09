let video;
let bodyPose;
let poses = [];
let particles = [];
let statusText;
let voronoiPoints = [];
let pixelArtGrid = [];
let portals = [];

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

    // Initialize portals
    for (let i = 0; i < 3; i++) {
        portals.push(createPortal());
    }
}

function createPortal() {
    return {
        x: random(width * 0.2, width * 0.8),
        y: random(height * 0.2, height * 0.8),
        currentSize: random(80, 150),
        targetSize: random(60, 200),
        rotation: random(TWO_PI),
        rotationSpeed: random(-0.02, 0.02),
        hue: random(360),
        targetHue: random(360),
        pulseOffset: random(TWO_PI),
        layers: floor(random(5, 9)),
        vx: random(-0.3, 0.3),
        vy: random(-0.3, 0.3),
        isHit: false,
        hitVelocityX: 0,
        hitVelocityY: 0,
        angularVelocity: 0
    };
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

    // Draw and update portals (in background layer)
    updateAndDrawPortals();

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
}

function updateAndDrawPortals() {
    // Check for collisions with skeleton keypoints
    if (poses.length > 0) {
        let pose = poses[0];

        // Key body parts that can hit portals (hands, feet, head, elbows, knees)
        let hitPoints = ['left_wrist', 'right_wrist', 'left_ankle', 'right_ankle',
                         'left_elbow', 'right_elbow', 'left_knee', 'right_knee', 'nose'];

        for (let portal of portals) {
            if (!portal.isHit) {
                for (let pointName of hitPoints) {
                    let keypoint = pose.keypoints.find(kp => kp.name === pointName);

                    if (keypoint && keypoint.confidence > 0.3) {
                        let kx = width - keypoint.x;
                        let ky = keypoint.y;
                        let distance = dist(kx, ky, portal.x, portal.y);

                        // Check if body part is touching portal
                        if (distance < portal.currentSize * 0.6) {
                            // Portal got hit!
                            portal.isHit = true;

                            // Calculate direction from portal to hit point
                            let angle = atan2(ky - portal.y, kx - portal.x);

                            // Launch portal away with force
                            let force = random(15, 25);
                            portal.hitVelocityX = cos(angle) * force;
                            portal.hitVelocityY = sin(angle) * force;

                            // Add spinning effect
                            portal.angularVelocity = random(-0.3, 0.3);

                            break;
                        }
                    }
                }
            }
        }
    }

    for (let i = portals.length - 1; i >= 0; i--) {
        let portal = portals[i];

        if (portal.isHit) {
            // Portal is flying away after being hit
            portal.x += portal.hitVelocityX;
            portal.y += portal.hitVelocityY;

            // Add gravity
            portal.hitVelocityY += 0.5;

            // Friction
            portal.hitVelocityX *= 0.98;

            // Rolling/spinning
            portal.rotation += portal.angularVelocity;

            // Remove if off screen
            if (portal.x < -200 || portal.x > width + 200 ||
                portal.y < -200 || portal.y > height + 200) {
                portals.splice(i, 1);
                // Create a new portal to replace it
                portals.push(createPortal());
                continue;
            }
        } else {
            // Normal portal behavior
            // Smooth size transition - growing and shrinking
            let sizeDiff = portal.targetSize - portal.currentSize;
            portal.currentSize += sizeDiff * 0.05;

            // When close to target, pick a new random target size
            if (abs(sizeDiff) < 5) {
                portal.targetSize = random(100, 280);
            }

            // Smooth color transition
            let hueDiff = portal.targetHue - portal.hue;
            if (hueDiff > 180) hueDiff -= 360;
            if (hueDiff < -180) hueDiff += 360;
            portal.hue += hueDiff * 0.02;
            if (portal.hue < 0) portal.hue += 360;
            if (portal.hue > 360) portal.hue -= 360;

            // Change target color randomly
            if (frameCount % 180 === 0 && random() < 0.4) {
                portal.targetHue = random(360);
            }

            // Rotation
            portal.rotation += portal.rotationSpeed;

            // Gentle drift movement
            portal.x += portal.vx;
            portal.y += portal.vy;

            // Bounce off edges
            if (portal.x < 150 || portal.x > width - 150) portal.vx *= -1;
            if (portal.y < 150 || portal.y > height - 150) portal.vy *= -1;
        }

        push();
        translate(portal.x, portal.y);
        rotate(portal.rotation);

        blendMode(ADD);

        let baseSize = portal.currentSize;

        // Pulsing effect
        let pulse = sin(frameCount * 0.05 + portal.pulseOffset) * 0.1 + 1;
        let animatedSize = baseSize * pulse;

        colorMode(HSB);

        // Draw dark center void
        noStroke();
        fill(0, 0, 0, 200);
        circle(0, 0, animatedSize * 0.5);

        // Draw multiple layers of electric energy ring
        for (let layer = portal.layers; layer >= 0; layer--) {
            let layerRadius = animatedSize * (0.5 + layer * 0.1);
            let layerAlpha = map(layer, 0, portal.layers, 150, 30);

            noFill();
            stroke(portal.hue, 90, 100, layerAlpha);
            strokeWeight(map(layer, 0, portal.layers, 6, 2));

            // Draw irregular circle with noise distortion for electric effect
            beginShape();
            for (let angle = 0; angle < TWO_PI + 0.1; angle += 0.1) {
                let noiseVal = noise(cos(angle) * 2, sin(angle) * 2, frameCount * 0.01 + layer);
                let r = layerRadius + noiseVal * 15;
                let x = cos(angle) * r;
                let y = sin(angle) * r;
                vertex(x, y);
            }
            endShape(CLOSE);
        }

        // Outer glow layers
        for (let i = 0; i < 3; i++) {
            let glowRadius = animatedSize * (1 + i * 0.15);
            let glowAlpha = map(i, 0, 3, 80, 10);

            noFill();
            stroke(portal.hue, 70, 100, glowAlpha);
            strokeWeight(8 - i * 2);
            circle(0, 0, glowRadius * 2);
        }

        colorMode(RGB);

        // Electric energy particles floating around the ring
        for (let i = 0; i < 25; i++) {
            let angle = (frameCount * 0.02 + i * 0.25) % TWO_PI;
            let radius = baseSize * (0.7 + noise(i, frameCount * 0.01) * 0.3);

            let px = cos(angle) * radius;
            let py = sin(angle) * radius;

            // Additional noise distortion for chaotic movement
            px += noise(i * 10, frameCount * 0.02) * 20 - 10;
            py += noise(i * 10 + 100, frameCount * 0.02) * 20 - 10;

            // Twinkling effect
            let twinkle = sin(frameCount * 0.1 + i) * 0.5 + 0.5;

            noStroke();
            colorMode(HSB);
            fill(portal.hue + random(-30, 30), 100, 100, 200 * twinkle);
            circle(px, py, random(4, 10));
            colorMode(RGB);
        }

        // Lightning bolts across the portal
        if (frameCount % 6 === 0 && random() < 0.5) {
            for (let i = 0; i < 3; i++) {
                let angle1 = random(TWO_PI);
                let angle2 = angle1 + random(-PI/3, PI/3);
                let r1 = random(baseSize * 0.3, baseSize * 0.9);
                let r2 = random(baseSize * 0.3, baseSize * 0.9);

                let x1 = cos(angle1) * r1;
                let y1 = sin(angle1) * r1;
                let x2 = cos(angle2) * r2;
                let y2 = sin(angle2) * r2;

                colorMode(HSB);
                stroke(portal.hue, 100, 100, 255);
                strokeWeight(2);
                line(x1, y1, x2, y2);
                colorMode(RGB);
            }
        }

        blendMode(BLEND);
        pop();
    }

    // Occasionally add or remove portals
    if (frameCount % 300 === 0) {
        if (portals.length < 4 && random() < 0.5) {
            portals.push(createPortal());
        } else if (portals.length > 2 && random() < 0.3) {
            portals.splice(floor(random(portals.length)), 1);
        }
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
        push();
        translate(this.pos.x, this.pos.y);

        // Rotate based on velocity direction for dynamic look
        let angle = this.vel.heading();
        rotate(angle);

        // Draw Claude-logo-inspired shape (curved wave/swoosh)
        noStroke();
        fill(this.hue, 80, 100, 0.8);

        // Main curved shape - similar to Claude's swoosh
        beginShape();
        // Create a smooth curved shape
        let baseSize = this.size;

        // Left curve (top part of swoosh)
        curveVertex(-baseSize * 0.8, -baseSize * 0.3);
        curveVertex(-baseSize * 0.6, -baseSize * 0.4);
        curveVertex(-baseSize * 0.2, -baseSize * 0.5);
        curveVertex(0, -baseSize * 0.4);
        curveVertex(baseSize * 0.3, -baseSize * 0.2);
        curveVertex(baseSize * 0.6, 0);

        // Right curve (bottom part of swoosh)
        curveVertex(baseSize * 0.6, 0);
        curveVertex(baseSize * 0.3, baseSize * 0.2);
        curveVertex(0, baseSize * 0.4);
        curveVertex(-baseSize * 0.2, baseSize * 0.5);
        curveVertex(-baseSize * 0.6, baseSize * 0.4);
        curveVertex(-baseSize * 0.8, baseSize * 0.3);

        endShape(CLOSE);

        // Add a subtle inner glow
        fill(this.hue, 60, 100, 0.5);
        beginShape();
        let innerSize = baseSize * 0.6;
        curveVertex(-innerSize * 0.6, -innerSize * 0.2);
        curveVertex(-innerSize * 0.4, -innerSize * 0.3);
        curveVertex(0, -innerSize * 0.3);
        curveVertex(innerSize * 0.4, -innerSize * 0.1);
        curveVertex(innerSize * 0.4, innerSize * 0.1);
        curveVertex(0, innerSize * 0.3);
        curveVertex(-innerSize * 0.4, innerSize * 0.3);
        curveVertex(-innerSize * 0.6, innerSize * 0.2);
        endShape(CLOSE);

        pop();
        colorMode(RGB);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    video.size(width, height);
}
