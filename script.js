const videoElement = document.getElementById('video-hidden');
const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');
const overlay = document.getElementById('instruction-overlay');
const textOverlay = document.getElementById('text-overlay');

let scene, camera, renderer, particles;
const particleCount = 6500; 
let currentShape = 'idle'; 
let targetPositions = new Float32Array(particleCount * 3);
let targetRotationX = 0, targetRotationY = 0;

function initThree() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.z = 8; 

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount*3; i++) {
        pos[i] = (Math.random()-0.5)*45; // Foto beterbangan sangat luas di awal
        targetPositions[i] = pos[i];
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    
    const texture = new THREE.TextureLoader().load('assets/foto.jpg');
    const material = new THREE.PointsMaterial({ 
        size: 0.38, // Ukuran butiran foto besar dan jelas
        map: texture, 
        transparent: true, 
        blending: THREE.AdditiveBlending, 
        depthWrite: false
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function updateTargetPositions() {
    const sScale = 2.6; 
    const hScale = 0.45; 

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        let tx, ty, tz;

        if (currentShape === 'saturn') {
            if (i < 4500) {
                const p = Math.acos(-1 + (2 * i) / 4500);
                const t = Math.sqrt(4500 * Math.PI) * p;
                tx = sScale * Math.cos(t) * Math.sin(p);
                ty = sScale * Math.sin(t) * Math.sin(p);
                tz = sScale * Math.cos(p);
            } else {
                const a = Math.random() * Math.PI * 2;
                const r = (sScale * 1.7) + Math.random() * 0.8; 
                tx = r * Math.cos(a); ty = r * Math.sin(a) * 0.2; tz = r * Math.sin(a);
            }
        } else if (currentShape === 'love') {
            const t = Math.random() * Math.PI * 2;
            tx = hScale * (16 * Math.pow(Math.sin(t), 3));
            ty = hScale * (13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t));
            tz = (Math.random()-0.5)*1.2;
        } else if (currentShape === 'text') {
            // Foto jadi latar belakang galaxy (menyebar)
            tx = (Math.random()-0.5)*40;
            ty = (Math.random()-0.5)*30;
            tz = (Math.random()-0.5)*10 - 7; // Mundur ke belakang agar teks hitam terlihat
        } else {
            // Idle: Tersebar luas di seluruh layar
            tx = (Math.random()-0.5)*40;
            ty = (Math.random()-0.5)*30;
            tz = (Math.random()-0.5)*20;
        }
        targetPositions[i3] = tx; targetPositions[i3+1] = ty; targetPositions[i3+2] = tz;
    }
}

function transform() {
    const pos = particles.geometry.attributes.position.array;
    const speed = (currentShape === 'idle' || currentShape === 'text') ? 0.02 : 0.15;

    for (let i = 0; i < particleCount * 3; i++) {
        pos[i] += (targetPositions[i] - pos[i]) * speed;
    }
    particles.geometry.attributes.position.needsUpdate = true;
    
    // Rotasi 3D mengikuti tangan
    if (currentShape === 'saturn' || currentShape === 'love') {
        particles.rotation.x += (targetRotationX - particles.rotation.x) * 0.05;
        particles.rotation.y += (targetRotationY - particles.rotation.y) * 0.05;
    } else {
        particles.rotation.y += 0.001; // Putar pelan otomatis
        particles.rotation.x *= 0.9;
    }
}

const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6 });

hands.onResults((res) => {
    let numHands = res.multiHandLandmarks ? res.multiHandLandmarks.length : 0;
    let anyFist = false;
    let isWaving = false;

    if (numHands > 0) {
        const h = res.multiHandLandmarks[0];
        targetRotationY = (h[0].x - 0.5) * 5;
        targetRotationX = (h[0].y - 0.5) * 5;

        for(let i=0; i<numHands; i++) {
            const hand = res.multiHandLandmarks[i];
            const d = Math.sqrt(Math.pow(hand[12].x - hand[0].x, 2) + Math.pow(hand[12].y - hand[0].y, 2));
            if (d < 0.25) anyFist = true; 
            else if (hand[8].y < hand[6].y) isWaving = true; 
        }
    }

    let newShape = 'idle';
    if (isWaving && !anyFist) newShape = 'text';
    else if (numHands === 1 && anyFist) newShape = 'saturn';
    else if (numHands === 2 && anyFist) newShape = 'love';

    if(currentShape !== newShape) {
        currentShape = newShape;
        updateTargetPositions();
        // Memunculkan teks hitam hanya saat mode 'text'
        textOverlay.style.opacity = (currentShape === 'text') ? '1' : '0';
    }
});

const cam = new Camera(videoElement, {
    onFrame: async () => { await hands.send({image: videoElement}); statusText.innerText="Kamera Siap!"; startBtn.style.display="inline-block"; },
    facingMode: 'user', width: 640, height: 480
});
cam.start();

startBtn.onclick = () => { overlay.style.display = "none"; updateTargetPositions(); };
function anim() { requestAnimationFrame(anim); transform(); renderer.render(scene, camera); }
initThree(); anim();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});