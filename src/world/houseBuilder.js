import * as THREE from 'three';
import { HOUSES } from '../data/worldConfig.js';
import { createSignTexture, createWoodTexture } from '../utils/textures.js';
import { spawnModel } from './modelLoader.js';

export function buildAllHouses(scene, colliders) {
  const woodTex = createWoodTexture('#5e3d24');
  const housesRuntime = [];

  HOUSES.forEach((cfg) => {
    const houseObj = buildSingleHouse(cfg, woodTex, colliders);
    scene.add(houseObj.group);
    housesRuntime.push(houseObj);
  });

  return housesRuntime;
}

function buildSingleHouse(cfg, woodTex, colliders) {
  const g = new THREE.Group();
  g.position.set(cfg.x, 0, cfg.z);
  g.rotation.y = cfg.rotY;

  const W = 8.4;
  const D = 8.4;
  const H = 4.4;
  const T = 0.35;

  const wallMat = new THREE.MeshStandardMaterial({ color: cfg.wallColor, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: cfg.roofColor, roughness: 0.78 });
  const woodMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6c543e, roughness: 0.9 });

  // Zemin ve Tavan
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), floorMat);
  floor.position.y = 0.1;
  floor.receiveShadow = true;
  g.add(floor);

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(W, 0.25, D), wallMat);
  ceiling.position.y = H;
  g.add(ceiling);

  // Çatı
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.8, 2.6, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = H + 1.35;
  roof.castShadow = true;
  g.add(roof);

  // Duvarlar
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), wallMat);
  backWall.position.set(0, H / 2, -D / 2 + T / 2);
  backWall.castShadow = true;
  backWall.receiveShadow = true;

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), wallMat);
  leftWall.position.set(-W / 2 + T / 2, H / 2, 0);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;

  const rightWall = leftWall.clone();
  rightWall.position.x = W / 2 - T / 2;

  const frontLeft = new THREE.Mesh(new THREE.BoxGeometry(3.1, H, T), wallMat);
  frontLeft.position.set(-2.65, H / 2, D / 2 - T / 2);
  frontLeft.castShadow = true;
  const frontRight = frontLeft.clone();
  frontRight.position.x = 2.65;
  const frontLintel = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.5, T), wallMat);
  frontLintel.position.set(0, H - 0.75, D / 2 - T / 2);

  g.add(backWall, leftWall, rightWall, frontLeft, frontRight, frontLintel);

  // Pencereler
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xffd799, emissive: 0x6b471b, emissiveIntensity: 0.45 });
  [-2.6, 2.6].forEach((wx) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.42), glassMat);
    win.position.set(wx, 2.3, D / 2 - T / 2);
    g.add(win);
  });

  // Tabela
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.72, 0.1),
    new THREE.MeshStandardMaterial({ map: createSignTexture(cfg.signText) })
  );
  sign.position.set(0, 3.6, D / 2 + 0.12);
  g.add(sign);

  // Kapı önü CC0 saksılar
  [-1.7, 1.7].forEach((px) => {
    const pot = spawnModel('/models/planter_pot.glb', { height: 0.6 });
    if (pot) {
      pot.position.set(px, 0, D / 2 + 0.55);
      g.add(pot);
    }
  });

  // Menteşeli Kapı (CC0 wooden_door.glb)
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.05, 0.2, D / 2 - T / 2);
  const doorModel = spawnModel('/models/wooden_door.glb', { height: 2.75 });
  if (doorModel) {
    doorModel.scale.set(2.1, 1, 0.5);
    doorModel.position.set(1.05, 0, 0);
    doorPivot.add(doorModel);
  } else {
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.75, 0.12), woodMat);
    doorMesh.position.set(1.05, 1.375, 0);
    doorMesh.castShadow = true;
    doorPivot.add(doorMesh);
  }
  g.add(doorPivot);

  // İç Mekan Aydınlatması
  const roomLight = new THREE.PointLight(cfg.lightColor, cfg.lightIntensity, 12);
  roomLight.position.set(0, 3.6, 0);
  g.add(roomLight);

  // CC0 İç Mekan Eşyaları
  buildInteriorProps(g, cfg);

  // CC0 Filozof Karakteri (Rigged + Animasyonlu)
  let mixer = null;
  let philosopher = spawnModel('/models/philosopher.glb', { height: 1.78, isSkinned: true });
  if (philosopher) {
    philosopher.position.set(0, 0.2, -1.5);
    const clips = philosopher.userData.animations || [];
    if (clips.length > 0) {
      mixer = new THREE.AnimationMixer(philosopher);
      const idleClip = clips.find((c) => /idle/i.test(c.name)) || clips[0];
      mixer.clipAction(idleClip).play();
    }
  } else {
    philosopher = new THREE.Group();
    philosopher.position.set(0, 0.2, -1.5);
  }
  g.add(philosopher);

  // Duvar colliderları (kapı açık bırakılır)
  g.updateMatrixWorld(true);
  const addLocalCollider = (lx1, lx2, lz1, lz2) => {
    const corners = [
      new THREE.Vector3(lx1, 0, lz1).applyMatrix4(g.matrixWorld),
      new THREE.Vector3(lx2, 0, lz2).applyMatrix4(g.matrixWorld),
    ];
    colliders.push({
      minX: Math.min(corners[0].x, corners[1].x),
      maxX: Math.max(corners[0].x, corners[1].x),
      minZ: Math.min(corners[0].z, corners[1].z),
      maxZ: Math.max(corners[0].z, corners[1].z),
    });
  };

  addLocalCollider(-W / 2, W / 2, -D / 2, -D / 2 + T);
  addLocalCollider(-W / 2, -W / 2 + T, -D / 2, D / 2);
  addLocalCollider(W / 2 - T, W / 2, -D / 2, D / 2);
  addLocalCollider(-W / 2, -1.1, D / 2 - T, D / 2);
  addLocalCollider(1.1, W / 2, D / 2 - T, D / 2);

  const doorWorldPos = new THREE.Vector3(0, 1.2, D / 2).applyMatrix4(g.matrixWorld);
  const philosopherWorldPos = new THREE.Vector3(0, 1.2, -1.5).applyMatrix4(g.matrixWorld);

  return {
    id: cfg.id,
    name: cfg.name,
    group: g,
    doorPivot,
    doorAngle: 0,
    isOpen: false,
    doorWorldPos,
    philosopher,
    philosopherWorldPos,
    mixer,
    worldCenter: new THREE.Vector3(cfg.x, 0, cfg.z),
  };
}

function buildInteriorProps(g, cfg) {
  const carpet = spawnModel('/models/carpet.glb', { scale: 2.0 });
  if (carpet) {
    carpet.position.set(0, 0.21, -0.3);
    g.add(carpet);
  }

  const desk = spawnModel('/models/wooden_table.glb', { height: 0.78 });
  if (desk) {
    desk.position.set(-2.3, 0.2, -2.2);
    g.add(desk);
  }

  const chair = spawnModel('/models/wooden_chair.glb', { height: 0.95 });
  if (chair) {
    chair.position.set(-2.3, 0.2, -1.3);
    chair.rotation.y = Math.PI;
    g.add(chair);
  }

  const shelf = spawnModel('/models/bookshelf.glb', { height: 2.2 });
  if (shelf) {
    shelf.position.set(2.8, 0.2, -3.4);
    g.add(shelf);
  }

  if (cfg.interiorTheme === 'library') {
    const shelf2 = spawnModel('/models/bookshelf.glb', { height: 2.2 });
    if (shelf2) {
      shelf2.position.set(3.4, 0.2, -0.6);
      shelf2.rotation.y = -Math.PI / 2;
      g.add(shelf2);
    }
    const books = spawnModel('/models/book_set.glb', { height: 0.45 });
    if (books) {
      books.position.set(-2.1, 0.98, -2.2);
      g.add(books);
    }
  }

  if (cfg.interiorTheme === 'cave') {
    const shadowWall = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 2.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 })
    );
    shadowWall.position.set(0, 1.9, -3.7);
    g.add(shadowWall);
  }

  if (cfg.interiorTheme === 'fireplace' || cfg.interiorTheme === 'dark') {
    const hearth = spawnModel('/models/fireplace.glb', { height: 2.2 });
    if (hearth) {
      hearth.position.set(3.2, 0.2, 0.8);
      hearth.rotation.y = -Math.PI / 2;
      g.add(hearth);
    }
    const clock = spawnModel('/models/wall_clock.glb', { height: 0.55 });
    if (clock) {
      clock.position.set(0, 2.6, -3.95);
      g.add(clock);
    }
  }

  const lamp = spawnModel('/models/oil_lamp.glb', { height: 0.48 });
  if (lamp) {
    lamp.position.set(-2.6, 0.98, -2.2);
    g.add(lamp);
  }

  const scroll = spawnModel('/models/scroll.glb', { height: 0.25 });
  if (scroll) {
    scroll.position.set(-1.9, 0.98, -2.1);
    g.add(scroll);
  }

  const frame = spawnModel('/models/picture_frame.glb', { height: 0.7 });
  if (frame) {
    frame.position.set(-2.2, 2.3, -3.98);
    g.add(frame);
  }

  const cup = spawnModel('/models/tea_cup.glb', { height: 0.16 });
  if (cup) {
    cup.position.set(-1.6, 0.98, -2.35);
    g.add(cup);
  }

  if (cfg.interiorTheme === 'dark' || cfg.interiorTheme === 'cave' || cfg.interiorTheme === 'fireplace') {
    const cand = spawnModel('/models/candelabrum.glb', { height: 0.95 });
    if (cand) {
      cand.position.set(2.2, 0.2, -1.8);
      g.add(cand);
    }
  }

  if (cfg.interiorTheme === 'bright' || cfg.interiorTheme === 'fireplace' || cfg.interiorTheme === 'warm') {
    const bed = spawnModel('/models/bed.glb', { height: 0.65 });
    if (bed) {
      bed.position.set(2.4, 0.2, 1.8);
      bed.rotation.y = -Math.PI / 2;
      g.add(bed);
    }
  }

  if (cfg.interiorTheme === 'dark') {
    const dice = spawnModel('/models/dice.glb', { height: 0.14 });
    if (dice) {
      dice.position.set(-2.2, 0.98, -1.95);
      g.add(dice);
    }
  }
}
