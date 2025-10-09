let video;
let bodyPose;
let poses = [];
let particles = [];
let statusText;

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
}

function gotPoses(results) {
    poses = results;
}

function draw() {
    // Semi-transparent background for trail effect
    background(0, 20);

    // Draw skeleton and keypoints
    drawKeypoints();
    drawSkeleton();

    // Update and display particles
    for (let particle of particles) {
        particle.update(poses);
        particle.display();
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
