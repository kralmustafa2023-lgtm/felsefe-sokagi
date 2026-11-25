import { HOUSES, LANDMARKS } from '../data/worldConfig.js';

export function drawMinimap(canvas, playerPos, playerYaw, completedSet, templeUnlocked) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = '#121622';
  ctx.fillRect(0, 0, w, h);

  // Dünya Z (-65..+65) -> Canvas X (20..w-20), Dünya X (-28..+28) -> Canvas Y
  const toMapX = (z) => ((65 - z) / 130) * (w - 60) + 30;
  const toMapY = (x) => ((x + 28) / 56) * (h - 40) + 20;

  // Taş sokak yolu
  ctx.fillStyle = '#3b3935';
  ctx.fillRect(toMapX(62), toMapY(-7.5), toMapX(-55) - toMapX(62), toMapY(7.5) - toMapY(-7.5));

  // Çeşme
  ctx.fillStyle = '#5bb5d8';
  ctx.beginPath();
  ctx.arc(toMapX(LANDMARKS.fountain.z), toMapY(LANDMARKS.fountain.x), 7, 0, Math.PI * 2);
  ctx.fill();

  // Cami
  ctx.fillStyle = '#8fa4b3';
  ctx.fillRect(toMapX(LANDMARKS.mosque.z) - 10, toMapY(LANDMARKS.mosque.x) - 10, 20, 20);
  ctx.fillStyle = '#ddd';
  ctx.font = '10px Segoe UI';
  ctx.fillText('Cami', toMapX(LANDMARKS.mosque.z) - 12, toMapY(LANDMARKS.mosque.x) + 22);

  // 6 Ev
  HOUSES.forEach((house) => {
    const mx = toMapX(house.z);
    const my = toMapY(house.x);
    const done = completedSet.has(house.id);
    ctx.fillStyle = done ? '#e8b85a' : house.id === 'hypatia' ? '#9e7bb5' : '#9c8b73';
    ctx.fillRect(mx - 12, my - 12, 24, 24);
    ctx.fillStyle = '#f5f0e6';
    ctx.font = '10px Segoe UI';
    ctx.textAlign = 'center';
    ctx.fillText(house.id.toUpperCase(), mx, my + (house.side === 'left' ? -16 : 24));
  });

  // Tapınak
  const tx = toMapX(LANDMARKS.temple.z);
  const ty = toMapY(LANDMARKS.temple.x);
  ctx.fillStyle = templeUnlocked ? '#e8b85a' : '#8a5ad8';
  ctx.fillRect(tx - 16, ty - 18, 32, 36);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('TAPINAK', tx, ty + 30);

  // Oyuncu konumu & bakış yönü
  const px = toMapX(playerPos.z);
  const py = toMapY(playerPos.x);
  ctx.fillStyle = '#58c98a';
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fill();

  const dx = Math.cos(playerYaw) * 12;
  const dy = -Math.sin(playerYaw) * 12;
  ctx.strokeStyle = '#58c98a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + dx, py + dy);
  ctx.stroke();
}
