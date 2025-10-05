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
    for (let i = 0; i < 100; i++) {
        particles.push(new Particle());
    }
}

function gotPoses(results) {
    poses = results;
}

function draw() {
    // Semi-transparent background for trail effect
    background(0, 20);

    // Draw mirrored video with low opacity
    push();
    translate(width, 0);
    scale(-1, 1);
    tint(255, 50);
    image(video, 0, 0, width, height);
    pop();

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
        this.maxSpeed = 4;
        this.size = random(3, 8);
        this.hue = random(360);
    }

    update(poses) {
        // Reset acceleration
        this.acc.mult(0);

        // React to pose keypoints
        if (poses.length > 0) {
            for (let keypoint of poses[0].keypoints) {
                if (keypoint.confidence > 0.2) {
                    let x = width - keypoint.x;
                    let y = keypoint.y;
                    let target = createVector(x, y);
                    let distance = p5.Vector.dist(this.pos, target);

                    if (distance < 150) {
                        // Repel from keypoints
                        let force = p5.Vector.sub(this.pos, target);
                        force.normalize();
                        force.mult(map(distance, 0, 150, 1, 0));
                        this.acc.add(force);
                    }
                }
            }
        }

        // Add slight random movement
        this.acc.add(createVector(random(-0.1, 0.1), random(-0.1, 0.1)));

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
