import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { SoundManager } from './audio/soundManager.js';
import { createSunsetSkyDome } from './utils/textures.js';
import { preloadModels } from './world/modelLoader.js';
import { buildStreetAndLandmarks } from './world/streetBuilder.js';
import { buildAllHouses } from './world/houseBuilder.js';
import { PlayerController } from './player/playerController.js';
import { DialogueManager } from './ui/dialogueManager.js';
import { QuestManager } from './ui/questManager.js';
import { drawMinimap } from './ui/minimap.js';

const MODEL_URLS = [
  '/models/greek_temple.glb',
  '/models/olive_tree.glb',
  '/models/street_lamp.glb',
  '/models/fountain.glb',
  '/models/bench.glb',
  '/models/marble_bust.glb',
  '/models/wooden_table.glb',
  '/models/wooden_chair.glb',
  '/models/bookshelf.glb',
  '/models/book_set.glb',
  '/models/fireplace.glb',
  '/models/oil_lamp.glb',
  '/models/wall_clock.glb',
  '/models/carpet.glb',
  '/models/scroll.glb',
  '/models/picture_frame.glb',
  '/models/philosopher.glb',
  '/models/planter_pot.glb',
  '/models/stone_wall.glb',
  '/models/wooden_door.glb',
  '/models/candelabrum.glb',
  '/models/bed.glb',
  '/models/tea_cup.glb',
  '/models/golden_key.glb',
  '/models/cat.glb',
  '/models/dice.glb',
];

const canvas = document.getElementById('game-canvas');
const startOverlay = document.getElementById('start-overlay');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const btnStart = document.getElementById('btn-start');
const hud = document.getElementById('hud');
const crosshair = document.getElementById('crosshair');
const interactPrompt = document.getElementById('interact-prompt');
const interactLabel = document.getElementById('interact-label');
const btnInteract = document.getElementById('btn-interact');
const mobileControls = document.getElementById('mobile-controls');
const mapModal = document.getElementById('map-modal');
const minimapCanvas = document.getElementById('minimap-canvas');
const creditsModal = document.getElementById('credits-modal');
const toastEl = document.getElementById('toast');

let toastTimer = null;
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('hidden'), 3200);
}

// 1. Sahne, Kamera ve Renderer
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x3a2b3f, 0.0075);

const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 300);

// Yedek gökyüzü + Işıklar
const fallbackSky = createSunsetSkyDome();
scene.add(fallbackSky);

const hemiLight = new THREE.HemisphereLight(0xffcf96, 0x2c2b3a, 0.72);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffb570, 1.55);
sunLight.position.set(30, 42, 24);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
sunLight.shadow.camera.near = 5;
sunLight.shadow.camera.far = 150;
sunLight.shadow.camera.left = -65;
sunLight.shadow.camera.right = 65;
sunLight.shadow.camera.top = 75;
sunLight.shadow.camera.bottom = -75;
scene.add(sunLight);

const sound = new SoundManager();
const player = new PlayerController(camera, canvas, sound);
if (isMobile) {
  player.setupMobileControls(
    document.getElementById('joystick-zone'),
    document.getElementById('joystick-knob'),
    document.getElementById('look-zone')
  );
}

const colliders = [];
let temple = null;
let houses = [];

const questManager = new QuestManager({
  sound,
  onProgressChange: (completedSet) => {
    if (temple && completedSet.size >= 5 && !temple.unlocked) {
      temple.unlocked = true;
      temple.doorCollider.disabled = true;
      sound.playSuccess();
      showToast('Tüm 5 anahtar toplandı! Sokağın sonundaki Tapınak kapısı açıldı!');
    }
  },
  onToast: showToast,
});

const dialogueManager = new DialogueManager({
  onStartQuest: (philosopherId) => {
    player.enabled = false;
    questManager.openQuest(philosopherId);
  },
  onClose: () => {
    if (!questManager.isOpen() && startOverlay.classList.contains('hidden')) {
      player.enabled = true;
    }
  },
});

// 2. CC0 HDRI & 18 GLB Modeli Yükle
async function initWorld() {
  try {
    const rgbe = new RGBELoader();
    const hdrTex = await rgbe.loadAsync('/textures/qwantani_sunset.hdr');
    hdrTex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdrTex;
    scene.background = hdrTex;
    scene.backgroundBlurriness = 0.06;
    scene.remove(fallbackSky);
  } catch (e) {
    console.warn('HDRI yüklenemedi, yedek gökyüzü kullanılıyor.', e);
  }

  await preloadModels(MODEL_URLS, (done, total) => {
    const pct = Math.round((done / total) * 85) + 10;
    loadingBar.style.width = `${pct}%`;
    loadingText.textContent = `3D modeller yükleniyor (${done}/${total})...`;
  });

  temple = buildStreetAndLandmarks(scene, colliders);
  houses = buildAllHouses(scene, colliders);
  player.setColliders(colliders);

  if (questManager.completed.size >= 5) {
    temple.unlocked = true;
    temple.doorCollider.disabled = true;
  }

  loadingBar.style.width = '100%';
  loadingText.textContent = 'Hazır! Keşfe başlayabilirsin.';
  btnStart.disabled = false;
  btnStart.textContent = 'Sokağa Gir';
}

initWorld();

// 3. UI & Kontroller
function enterGame() {
  startOverlay.classList.add('hidden');
  hud.classList.remove('hidden');
  crosshair.classList.toggle('hidden', isMobile);
  mobileControls.classList.toggle('hidden', !isMobile);
  player.enabled = true;
  sound.startAmbient();
  if (!isMobile) {
    canvas.requestPointerLock?.();
  }
}

btnStart.addEventListener('click', enterGame);
document.getElementById('btn-menu').addEventListener('click', () => {
  player.enabled = false;
  document.exitPointerLock?.();
  startOverlay.classList.remove('hidden');
});

document.getElementById('btn-sound').addEventListener('click', (e) => {
  const muted = sound.toggleMute();
  e.currentTarget.textContent = muted ? '🔇 Sessiz' : '🔊 Ses';
});

function toggleMap() {
  const opening = mapModal.classList.contains('hidden');
  mapModal.classList.toggle('hidden');
  if (opening) {
    document.exitPointerLock?.();
    player.enabled = false;
    drawMinimap(minimapCanvas, player.position, player.yaw, questManager.completed, temple?.unlocked);
  } else if (!dialogueManager.isOpen() && !questManager.isOpen()) {
    player.enabled = true;
  }
}

document.getElementById('btn-map').addEventListener('click', toggleMap);
document.getElementById('btn-map-close').addEventListener('click', toggleMap);
document.getElementById('btn-credits').addEventListener('click', () => creditsModal.classList.remove('hidden'));
document.getElementById('btn-credits-close').addEventListener('click', () => creditsModal.classList.add('hidden'));

let currentTarget = null;
function triggerInteraction() {
  if (!currentTarget) return;
  if (currentTarget.type === 'philosopher') {
    player.enabled = false;
    dialogueManager.openPhilosopher(currentTarget.id, questManager.completed);
  } else if (currentTarget.type === 'temple_door') {
    showToast('Tapınak kilitli! Önce 5 filozoftan 5 anahtar parçasını topla.');
  } else if (currentTarget.type === 'temple_book') {
    player.enabled = false;
    dialogueManager.openTempleFinale(() => {
      showToast('Felsefe Sokağı yolculuğunu tamamladın!');
    });
  }
}

btnInteract.addEventListener('click', triggerInteraction);

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' && !dialogueManager.isOpen() && !questManager.isOpen() && startOverlay.classList.contains('hidden')) {
    triggerInteraction();
  } else if (e.code === 'KeyM' && startOverlay.classList.contains('hidden') && !dialogueManager.isOpen() && !questManager.isOpen()) {
    toggleMap();
  }
});

const observer = new MutationObserver(() => {
  if (!questManager.isOpen() && !dialogueManager.isOpen() && mapModal.classList.contains('hidden') && startOverlay.classList.contains('hidden')) {
    player.enabled = true;
  }
});
observer.observe(document.getElementById('quest-modal'), { attributes: true, attributeFilter: ['class'] });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 4. Ana Oyun Döngüsü
let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  player.update(dt);

  let nearTarget = null;
  for (const h of houses) {
    const doorDist = player.position.distanceTo(h.doorWorldPos);
    if (doorDist < 3.0 && !h.isOpen) {
      h.isOpen = true;
      sound.playDoor(true);
    } else if (doorDist > 5.0 && h.isOpen) {
      h.isOpen = false;
      sound.playDoor(false);
    }

    const targetAngle = h.isOpen ? -Math.PI * 0.56 : 0;
    h.doorAngle += (targetAngle - h.doorAngle) * Math.min(1, dt * 6);
    h.doorPivot.rotation.y = h.doorAngle;

    h.mixer?.update(dt);
    const philDist = player.position.distanceTo(h.philosopherWorldPos);
    if (philDist < 4.5) {
      const dx = player.position.x - h.philosopherWorldPos.x;
      const dz = player.position.z - h.philosopherWorldPos.z;
      const worldAngle = Math.atan2(dx, dz);
      h.philosopher.rotation.y = worldAngle - h.group.rotation.y;
    }

    if (philDist < 2.6) {
      nearTarget = { type: 'philosopher', id: h.id, label: `${h.name.replace(' Evi', '')} ile Konuş` };
    }
  }

  if (temple) {
    const templeTargetAngle = temple.unlocked ? -Math.PI * 0.55 : 0;
    temple.doorAngle += (templeTargetAngle - temple.doorAngle) * Math.min(1, dt * 3.5);
    temple.doorPivot.rotation.y = temple.doorAngle;

    temple.bookMesh.rotation.y += dt * 0.8;
    temple.bookMesh.position.y = 1.85 + Math.sin(now * 0.003) * 0.08;

    if (!temple.unlocked && player.position.distanceTo(temple.doorWorldPos) < 3.2) {
      nearTarget = { type: 'temple_door', id: 'temple', label: 'Tapınak Kapısı (5 Anahtar Gerekli)' };
    } else if (temple.unlocked && player.position.distanceTo(temple.bookWorldPos) < 2.8) {
      nearTarget = { type: 'temple_book', id: 'book', label: 'Bilgelik Kitabını Oku' };
    }
  }

  currentTarget = nearTarget;
  if (nearTarget && player.enabled) {
    interactLabel.textContent = nearTarget.label;
    interactPrompt.classList.remove('hidden');
  } else {
    interactPrompt.classList.add('hidden');
  }

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
