let video;
let bodyPose;
let poses = [];
let particles = [];
let statusText;
let voronoiPoints = [];

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
            hue: random(200, 280), // Blue/purple range
            noiseOffsetX: random(1000),
            noiseOffsetY: random(1000),
            noiseSpeed: random(0.002, 0.005)
        });
    }
}

function gotPoses(results) {
    poses = results;
}

function draw() {
    // Solid background
    background(0);

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
        colorMode(HSB);
        fill(point.hue, 80, 80, 255);
        noStroke();
        circle(point.x, point.y, 12);
        colorMode(RGB);
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
                        colorMode(HSB);
                        stroke(point.hue, 60, 90, alpha);
                        strokeWeight(2);
                        line(point.x, point.y, kx, ky);
                        colorMode(RGB);
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

                // Change color based on proximity
                point.hue = map(closestDist, 0, 200, 300, 220);
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
