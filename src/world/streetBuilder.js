import * as THREE from 'three';
import { LANDMARKS, STREET_LENGTH } from '../data/worldConfig.js';
import { createCobblestoneTexture, createSignTexture } from '../utils/textures.js';
import { spawnModel } from './modelLoader.js';

export function buildStreetAndLandmarks(scene, colliders) {
  const streetGroup = new THREE.Group();

  // Zemin: Poly Haven CC0 Taş kaldırım dokusu + yan çimen alanlar
  const texLoader = new THREE.TextureLoader();
  const cobbleTex = texLoader.load('/textures/cobblestone_diff.png');
  cobbleTex.wrapS = THREE.RepeatWrapping;
  cobbleTex.wrapT = THREE.RepeatWrapping;
  cobbleTex.repeat.set(6, 44);
  cobbleTex.colorSpace = THREE.SRGBColorSpace;
  const roadMat = new THREE.MeshStandardMaterial({
    map: cobbleTex,
    roughness: 0.85,
    metalness: 0.05,
  });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(15, STREET_LENGTH + 18), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, -2);
  road.receiveShadow = true;
  streetGroup.add(road);

  // Tapınak meydanı
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(18, 32), roadMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(0, 0.015, -52);
  plaza.receiveShadow = true;
  streetGroup.add(plaza);

  // Dış zemin
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3b4432, roughness: 0.95 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(180, 220), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  streetGroup.add(ground);

  // Çeşme (CC0 GLB)
  buildFountain(streetGroup, colliders, LANDMARKS.fountain.x, LANDMARKS.fountain.z);

  // Harita Panosu
  buildMapBoard(streetGroup, colliders, LANDMARKS.mapBoard.x, LANDMARKS.mapBoard.z);

  // Cami ve Minare (sağ tarafta, uzaktan görünür)
  buildMosque(streetGroup, colliders, LANDMARKS.mosque.x, LANDMARKS.mosque.z);

  // Zeytin Ağaçları (CC0 GLB)
  buildOliveTrees(streetGroup, colliders);

  // Sokak Lambaları (CC0 GLB)
  buildStreetLamps(streetGroup);

  // Banklar (CC0 GLB) ve taş çitler
  buildBenchesAndWalls(streetGroup, colliders);

  // Yunan Tapınağı (CC0 GLB + Büstler + Bilgelik Kitabı)
  const templeData = buildTemple(streetGroup, colliders, LANDMARKS.temple.x, LANDMARKS.temple.z);

  scene.add(streetGroup);
  return templeData;
}

function buildFountain(parent, colliders, x, z) {
  const model = spawnModel('/models/fountain.glb', { height: 1.5 });
  if (model) {
    model.scale.setScalar(1.8);
    model.position.set(x, 0, z);
    parent.add(model);
  }
  colliders.push({ minX: x - 2.0, maxX: x + 2.0, minZ: z - 2.0, maxZ: z + 2.0 });
}

function buildMapBoard(parent, colliders, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = 0.35;

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.85 });
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), woodMat);
  postL.position.set(-0.9, 1.1, 0);
  const postR = postL.clone();
  postR.position.x = 0.9;
  g.add(postL, postR);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.1, 0.12),
    new THREE.MeshStandardMaterial({ map: createSignTexture('FELSEFE SOKAĞI', '5 Filozof · 1 Tapınak (M: Harita)') })
  );
  board.position.y = 1.75;
  board.castShadow = true;
  g.add(board);

  parent.add(g);
  colliders.push({ minX: x - 1.1, maxX: x + 1.1, minZ: z - 0.5, maxZ: z + 0.5 });
}

function buildMosque(parent, colliders, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6decb, roughness: 0.8 });
  const domeMat = new THREE.MeshStandardMaterial({ color: 0x5d6e7a, roughness: 0.5, metalness: 0.2 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8b85a, metalness: 0.8, roughness: 0.25 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(10, 6.5, 10), wallMat);
  base.position.y = 3.25;
  base.castShadow = true;
  base.receiveShadow = true;
  g.add(base);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.position.y = 6.5;
  g.add(dome);

  const minaret = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.95, 16, 12), wallMat);
  minaret.position.set(-4.5, 8, 4.5);
  minaret.castShadow = true;
  g.add(minaret);

  const balcony = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.0, 0.45, 12), wallMat);
  balcony.position.set(-4.5, 12.2, 4.5);
  g.add(balcony);

  const spire = new THREE.Mesh(new THREE.ConeGeometry(0.75, 3.2, 12), domeMat);
  spire.position.set(-4.5, 17.6, 4.5);
  g.add(spire);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), goldMat);
  finial.position.set(-4.5, 19.3, 4.5);
  g.add(finial);

  parent.add(g);
  colliders.push({ minX: x - 5.2, maxX: x + 5.2, minZ: z - 5.2, maxZ: z + 5.2 });
}

function buildOliveTrees(parent, colliders) {
  const positions = [];
  for (let z = 48; z >= -42; z -= 14) {
    positions.push([-8.5, z + 5], [8.5, z + 5]);
  }
  positions.push([-16, -48], [16, -48], [-19, -58], [19, -58]);

  positions.forEach(([tx, tz], idx) => {
    const h = 4.2 + (idx % 3) * 0.7;
    const tree = spawnModel('/models/olive_tree.glb', { height: h });
    if (tree) {
      tree.position.set(tx, 0, tz);
      tree.rotation.y = idx * 1.1;
      parent.add(tree);
    }
    colliders.push({ minX: tx - 0.55, maxX: tx + 0.55, minZ: tz - 0.55, maxZ: tz + 0.55 });
  });
}

function buildStreetLamps(parent) {
  const lampPositions = [
    [-6.8, 40, Math.PI / 2], [6.8, 40, -Math.PI / 2],
    [-6.8, 22, Math.PI / 2], [6.8, 22, -Math.PI / 2],
    [-6.8, 4, Math.PI / 2], [6.8, 4, -Math.PI / 2],
    [-6.8, -14, Math.PI / 2], [6.8, -14, -Math.PI / 2],
    [-6.8, -32, Math.PI / 2], [6.8, -32, -Math.PI / 2],
  ];

  lampPositions.forEach(([lx, lz, rot], idx) => {
    const lamp = spawnModel('/models/street_lamp.glb', { height: 3.8 });
    if (lamp) {
      lamp.position.set(lx, 0, lz);
      lamp.rotation.y = rot;
      parent.add(lamp);
    }
    if (idx % 2 === 0) {
      const light = new THREE.PointLight(0xffbe66, 4.2, 16, 1.5);
      light.position.set(lx, 3.6, lz);
      parent.add(light);
    }
  });
}

function buildBenchesAndWalls(parent, colliders) {
  const benchCoords = [
    [-5.8, 24, Math.PI / 2],
    [5.8, -6, -Math.PI / 2],
    [-9.5, -46, 0.4],
    [9.5, -46, -0.4],
  ];

  benchCoords.forEach(([bx, bz, rot]) => {
    const bench = spawnModel('/models/bench.glb', { height: 0.9 });
    if (bench) {
      bench.position.set(bx, 0, bz);
      bench.rotation.y = rot;
      parent.add(bench);
    }
    colliders.push({ minX: bx - 0.9, maxX: bx + 0.9, minZ: bz - 0.5, maxZ: bz + 0.5 });
  });

  // Sokak sınır taş duvarları (CC0 stone_wall.glb)
  for (let wz = -46; wz <= 54; wz += 4.0) {
    [-20, 20].forEach((wx) => {
      const wall = spawnModel('/models/stone_wall.glb', { height: 1.4 });
      if (wall) {
        wall.position.set(wx, 0, wz);
        wall.rotation.y = Math.PI / 2;
        wall.scale.set(2.0, 1, 1);
        parent.add(wall);
      }
    });
  }

  // Sokak kedileri (CC0 cat.glb)
  [
    [-6.2, 39, 0.7],
    [6.1, -18, -0.9],
    [-2.5, 51.5, 0.3],
  ].forEach(([cx, cz, rot]) => {
    const cat = spawnModel('/models/cat.glb', { height: 0.42 });
    if (cat) {
      cat.position.set(cx, 0, cz);
      cat.rotation.y = rot;
      parent.add(cat);
    }
  });
}

function buildTemple(parent, colliders, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  // Gerçek CC0 Yunan Tapınağı dış kabuğu
  const templeModel = spawnModel('/models/greek_temple.glb', { height: 11.5 });
  if (templeModel) {
    templeModel.position.set(0, 0, 0);
    g.add(templeModel);
  }

  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.55 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8b85a, metalness: 0.7, roughness: 0.25 });

  // Kilitli Tapınak Kapısı (5 anahtar toplanınca açılır)
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-1.55, 0.4, 6.0);
  const doorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 4.0, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x5c3b1e, roughness: 0.7 })
  );
  doorMesh.position.set(1.55, 2.0, 0);
  const seal = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.68, 20), goldMat);
  seal.position.set(1.55, 2.2, 0.14);
  doorPivot.add(doorMesh, seal);
  g.add(doorPivot);

  // Merkez kaide + parlayan Bilgelik Kitabı
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.75, 1.3, 12), marbleMat);
  pedestal.position.set(0, 1.0, -1);
  g.add(pedestal);

  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.14, 0.55),
    new THREE.MeshStandardMaterial({ color: 0xf7d782, emissive: 0xe8a838, emissiveIntensity: 0.9 })
  );
  book.position.set(0, 1.85, -1);
  g.add(book);

  const templeLight = new THREE.PointLight(0xffdfa0, 4.0, 20);
  templeLight.position.set(0, 4.5, -1);
  g.add(templeLight);

  // Tapınak kaidesi etrafında 5 altın anahtar (CC0 golden_key.glb)
  for (let k = 0; k < 5; k++) {
    const ka = (k / 5) * Math.PI * 2;
    const key = spawnModel('/models/golden_key.glb', { height: 0.35 });
    if (key) {
      key.position.set(Math.cos(ka) * 1.1, 1.4, -1 + Math.sin(ka) * 1.1);
      key.rotation.y = ka;
      g.add(key);
    }
  }

  // 5 filozof mermer büstü (CC0 GLB)
  for (let i = 0; i < 5; i++) {
    const angle = (i - 2) * 0.52;
    const bx = Math.sin(angle) * 4.0;
    const bz = -1 - Math.cos(angle) * 3.2;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.1, 0.65), marbleMat);
    plinth.position.set(bx, 0.85, bz);
    g.add(plinth);

    const bust = spawnModel('/models/marble_bust.glb', { height: 0.75 });
    if (bust) {
      bust.position.set(bx, 1.4, bz);
      bust.rotation.y = -angle;
      g.add(bust);
    }
  }

  parent.add(g);

  colliders.push(
    { minX: x - 6.3, maxX: x + 6.3, minZ: z - 6.3, maxZ: z - 5.6 },
    { minX: x - 6.3, maxX: x - 5.6, minZ: z - 6.2, maxZ: z + 6.2 },
    { minX: x + 5.6, maxX: x + 6.3, minZ: z - 6.2, maxZ: z + 6.2 },
    { minX: x - 6.2, maxX: x - 1.6, minZ: z + 5.6, maxZ: z + 6.3 },
    { minX: x + 1.6, maxX: x + 6.2, minZ: z + 5.6, maxZ: z + 6.3 }
  );

  const doorCollider = { minX: x - 1.6, maxX: x + 1.6, minZ: z + 5.6, maxZ: z + 6.3, disabled: false };
  colliders.push(doorCollider);

  return {
    doorPivot,
    doorCollider,
    doorWorldPos: new THREE.Vector3(x, 1.5, z + 6.5),
    bookMesh: book,
    bookWorldPos: new THREE.Vector3(x, 1.7, z - 1),
    unlocked: false,
    doorAngle: 0,
  };
}
