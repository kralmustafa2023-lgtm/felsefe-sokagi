import * as THREE from 'three';

export function createCobblestoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4e4b45';
  ctx.fillRect(0, 0, 512, 512);

  const rows = 12;
  const cols = 8;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cellW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const x = c * cellW + offset + 3;
      const y = r * cellH + 3;
      const w = cellW - 6;
      const h = cellH - 6;
      const shade = 92 + Math.floor(Math.random() * 36);
      ctx.fillStyle = `rgb(${shade + 6}, ${shade}, ${shade - 8})`;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 52);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWoodTexture(baseHex = '#6c472c') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(20, 10, 4, 0.25)';
  for (let i = 0; i < 32; i++) {
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const x = i * 8;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, 256);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSignTexture(title, subtitle = '') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2b2016';
  ctx.fillRect(0, 0, 512, 160);
  ctx.strokeStyle = '#e8b85a';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 496, 144);

  ctx.fillStyle = '#f8e6be';
  ctx.font = 'bold 38px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, 256, subtitle ? 64 : 80);

  if (subtitle) {
    ctx.fillStyle = '#d4b475';
    ctx.font = '22px Segoe UI, sans-serif';
    ctx.fillText(subtitle, 256, 112);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createSunsetSkyDome() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#141a35');
  grad.addColorStop(0.32, '#3a2c54');
  grad.addColorStop(0.54, '#a64d59');
  grad.addColorStop(0.7, '#e68c4c');
  grad.addColorStop(0.84, '#f7c873');
  grad.addColorStop(1.0, '#362d2a');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Yıldızlar (üst gökyüzü)
  ctx.fillStyle = 'rgba(255, 255, 240, 0.7)';
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 170;
    const r = Math.random() * 1.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.SphereGeometry(220, 32, 24);
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false });
  return new THREE.Mesh(geo, mat);
}
