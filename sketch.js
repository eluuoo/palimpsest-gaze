let handPose;
let video;
let hands = [];
let gazeMarks = [];
let modelLoaded = false;
let isRebellion = false;
let rebellionTimer = 0;

// Audio system variables
let osc, noise, env, filter;

const POETIC_TEXTS = [
  "MY BODY IS NOT YOUR DATA.",
  "THE GHOST IN THE MACHINE AWAKENS.",
  "I AM THE UNMAPPED TERRITORY.",
  "BEYOND THE ALGORITHMIC GAZE."
];
let currentPoem = "";

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture({
    video: true,
    audio: false
  });
  video.size(640, 480);
  video.hide();

  // Initialize the audio system
  setupAudio();

  handPose.detectStart(video, (results) => {
    hands = results;
    modelLoaded = true;
  });

  for (let i = 0; i < 50; i++) {
    gazeMarks.push(new GazeMark());
  }
  textFont('Courier New');
}

function setupAudio() {
  // 1. Basic oscillator (for the wipe sound)
  osc = new p5.Oscillator('sine');
  osc.start();
  osc.amp(0);

  // 2. Noise generator (used to create the physical texture of the shattering sound)
  noise = new p5.Noise('white');
  noise.start();
  noise.amp(0);

  // 3. Filter (to add depth to the crash sound)
  filter = new p5.LowPass();
  noise.disconnect();
  noise.connect(filter);

  // 4. Envelope generator
  env = new p5.Envelope();
  env.setRange(0.6, 0);
}

function playEraseSound() {
  if (getAudioContext().state !== 'running') getAudioContext().resume();
  osc.setType('sine');
  osc.freq(880);
  env.setADSR(0.001, 0.1, 0.1, 0.1);
  env.play(osc);
}

// Shattering sound effects: simulating physical explosions and shattering
function playShatterSound() {
  if (getAudioContext().state !== 'running') getAudioContext().resume();

  // Set the filter frequency from high to low
  filter.freq(2000);
  filter.freq(40, 2.0); // Frequency drop within 2 seconds

  // 0.01s attack (explosive impact), 2.5s decay (long sustain)
  env.setADSR(0.01, 0.4, 0.2, 2.5);
  env.play(noise);

  // A low-frequency pulse is added to enhance the impact
  osc.setType('triangle');
  osc.freq(60);
  env.play(osc);
}

function draw() {
  background(0, 70);

  if (!modelLoaded) {
    showLoading();
    return;
  }

  if (hands.length >= 2 && !isRebellion) {
    triggerRebellion();
  }

  for (let i = gazeMarks.length - 1; i >= 0; i--) {
    let m = gazeMarks[i];

    if (hands.length > 0 && !isRebellion) {
      for (let hand of hands) {
        let indexTip = hand.index_finger_tip;
        let mx = map(indexTip.x, 0, 640, width, 0);
        let my = map(indexTip.y, 0, 480, 0, height);

        if (dist(mx, my, m.x, m.y) < 60) {
          if (!m.erased) {
            playEraseSound();
          }
          m.erase();
        }
      }
    }
    m.update();
    m.display();
  }

  if (!isRebellion) {
    drawEraser();
  } else {
    displayPoeticJustice();
  }
}

class GazeMark {
  constructor() {
    this.init();
  }
  init() {
    this.x = random(width);
    this.y = random(-height, 0);
    this.txt = random(["SUBJECT", "BIO_SCAN", "LOCKED", "IDENTIFIED", "TARGET", "DATA"]);
    this.erased = false;
    this.alpha = 255;
    this.speed = random(1.5, 3);
    this.vx = 0;
    this.vy = 0;
  }
  update() {
    if (isRebellion) {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= 5;
    } else if (!this.erased) {
      this.y += this.speed;
      if (this.y > height) this.y = -20;
    } else {
      this.y -= 2;
      this.alpha -= 10;
      if (this.alpha <= 0) this.init();
    }
  }
  display() {
    push();
    translate(this.x, this.y);
    if (!this.erased) {
      fill(255, this.alpha * 0.7);
      textSize(16);
      text(this.txt, 0, 0);
      stroke(255, 30);
      noFill();
      rect(-5, -14, textWidth(this.txt) + 10, 18);
    } else if (this.erased && !isRebellion) {
      fill(255, 0, 255, this.alpha);
      textSize(18);
      text("REWRITE", 0, 0);
    }
    pop();
  }
  erase() { this.erased = true; }
  shatter() {
    this.vx = random(-15, 15);
    this.vy = random(-15, 15);
  }
}

function drawEraser() {
  for (let hand of hands) {
    let it = hand.index_finger_tip;
    let mx = map(it.x, 0, 640, width, 0);
    let my = map(it.y, 0, 480, 0, height);

    noStroke();
    for (let r = 60; r > 0; r -= 10) {
      fill(255, 255, 255, 5);
      circle(mx, my, r);
    }
    fill(255, 200);
    circle(mx, my, 8);
  }
}

function triggerRebellion() {
  isRebellion = true;
  rebellionTimer = 180;
  currentPoem = random(POETIC_TEXTS);

  playShatterSound(); // Trigger the Enhanced Shattering Sound

  gazeMarks.forEach(m => m.shatter());
}

function displayPoeticJustice() {
  push();
  textAlign(CENTER);
  fill(255, 0, 255, rebellionTimer * 2);
  textSize(40);
  text(currentPoem, width / 2, height / 2);

  for (let i = 0; i < 5; i++) {
    stroke(255, 0, 255, rebellionTimer);
    point(random(width), random(height));
  }
  pop();

  rebellionTimer--;
  if (rebellionTimer <= 0) {
    isRebellion = false;
    gazeMarks.forEach(m => m.init());
  }
}

function showLoading() {
  fill(255);
  textAlign(CENTER);
  text("BOOTING PALIMPSEST SYSTEM...", width / 2, height / 2);
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }

function mousePressed() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}