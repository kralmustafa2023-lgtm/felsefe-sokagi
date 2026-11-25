import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
gltfLoader.setDRACOLoader(dracoLoader);

const cache = new Map();

export async function preloadModels(urls, onProgress) {
  let done = 0;
  await Promise.all(
    urls.map(async (url) => {
      try {
        const gltf = await gltfLoader.loadAsync(url);
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        cache.set(url, gltf);
      } catch (err) {
        console.warn(`Model yüklenemedi (${url}):`, err);
      } finally {
        done++;
        onProgress?.(done, urls.length);
      }
    })
  );
}

export function spawnModel(url, { height = null, scale = 1, isSkinned = false } = {}) {
  const gltf = cache.get(url);
  if (!gltf) return null;

  const root = isSkinned ? SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);

  if (height !== null) {
    const box = new THREE.Box3().setFromObject(root);
    const curH = box.max.y - box.min.y;
    if (curH > 0.001) {
      const s = height / curH;
      root.scale.multiplyScalar(s);
    }
  } else if (scale !== 1) {
    root.scale.multiplyScalar(scale);
  }

  // Tabanı y = 0 hizasına oturt
  root.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(root);
  root.position.y -= box2.min.y;

  const wrapper = new THREE.Group();
  wrapper.add(root);
  wrapper.userData.animations = gltf.animations || [];
  return wrapper;
}
