import * as THREE from 'three';

export class PlayerController {
  constructor(camera, domElement, soundManager) {
    this.camera = camera;
    this.domElement = domElement;
    this.sound = soundManager;

    this.position = new THREE.Vector3(0, 1.7, 60);
    this.yaw = 0; // 0 = -Z yönüne (tapınağa doğru) bakış
    this.pitch = 0;
    this.eyeHeight = 1.7;
    this.radius = 0.42;
    this.speed = 5.4;

    this.keys = new Set();
    this.joyVec = { x: 0, y: 0 };
    this.isLocked = false;
    this.enabled = false;

    this.colliders = []; // { minX, maxX, minZ, maxZ }
    this.stepTimer = 0;
    this.bobPhase = 0;

    this._bindEvents();
  }

  setColliders(colliders) {
    this.colliders = colliders;
  }

  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled || !this.isLocked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.002;
      this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch));
    });

    this.domElement.addEventListener('click', () => {
      if (!this.enabled) return;
      if (!this.isTouchDevice() && document.pointerLockElement !== this.domElement) {
        this.domElement.requestPointerLock?.();
      }
    });
  }

  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  setupMobileControls(joystickZone, joystickKnob, lookZone) {
    let joyTouchId = null;
    let joyCenter = { x: 0, y: 0 };
    const maxDist = 40;

    joystickZone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      const rect = joystickZone.getBoundingClientRect();
      joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this.sound.startAmbient();
    }, { passive: true });

    joystickZone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          const dx = t.clientX - joyCenter.x;
          const dy = t.clientY - joyCenter.y;
          const dist = Math.min(maxDist, Math.hypot(dx, dy));
          const angle = Math.atan2(dy, dx);
          const nx = (Math.cos(angle) * dist) / maxDist;
          const ny = (Math.sin(angle) * dist) / maxDist;
          this.joyVec.x = nx;
          this.joyVec.y = ny;
          joystickKnob.style.transform = `translate(calc(-50% + ${nx * maxDist}px), calc(-50% + ${ny * maxDist}px))`;
        }
      }
    }, { passive: true });

    const resetJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          joyTouchId = null;
          this.joyVec.x = 0;
          this.joyVec.y = 0;
          joystickKnob.style.transform = 'translate(-50%, -50%)';
        }
      }
    };
    joystickZone.addEventListener('touchend', resetJoy, { passive: true });
    joystickZone.addEventListener('touchcancel', resetJoy, { passive: true });

    let lookTouchId = null;
    let lastLook = { x: 0, y: 0 };

    lookZone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      lookTouchId = t.identifier;
      lastLook = { x: t.clientX, y: t.clientY };
      this.sound.startAmbient();
    }, { passive: true });

    lookZone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookTouchId) {
          const dx = t.clientX - lastLook.x;
          const dy = t.clientY - lastLook.y;
          lastLook = { x: t.clientX, y: t.clientY };
          this.yaw -= dx * 0.0045;
          this.pitch -= dy * 0.004;
          this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch));
        }
      }
    }, { passive: true });

    const endLook = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === lookTouchId) lookTouchId = null;
      }
    };
    lookZone.addEventListener('touchend', endLook, { passive: true });
    lookZone.addEventListener('touchcancel', endLook, { passive: true });
  }

  update(dt) {
    if (!this.enabled) {
      this._syncCamera(0);
      return;
    }

    let forward = 0;
    let strafe = 0;

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;

    forward -= this.joyVec.y;
    strafe += this.joyVec.x;

    const len = Math.hypot(forward, strafe);
    let moving = false;
    if (len > 0.05) {
      moving = true;
      const scale = Math.min(1, len);
      const nf = (forward / len) * scale;
      const ns = (strafe / len) * scale;

      const sin = Math.sin(this.yaw);
      const cos = Math.cos(this.yaw);
      const vx = (-sin * nf + cos * ns) * this.speed * dt;
      const vz = (-cos * nf - sin * ns) * this.speed * dt;

      this._moveWithCollision(vx, vz);
    }

    if (moving) {
      this.bobPhase += dt * 10;
      this.stepTimer += dt;
      if (this.stepTimer > 0.42) {
        this.stepTimer = 0;
        this.sound.playFootstep();
      }
    } else {
      this.stepTimer = 0.25;
    }

    const bobOffset = moving ? Math.sin(this.bobPhase) * 0.045 : 0;
    this._syncCamera(bobOffset);
  }

  _moveWithCollision(dx, dz) {
    const nextX = this.position.x + dx;
    if (!this._collides(nextX, this.position.z)) {
      this.position.x = nextX;
    }
    const nextZ = this.position.z + dz;
    if (!this._collides(this.position.x, nextZ)) {
      this.position.z = nextZ;
    }

    // Dünya sınırları
    this.position.x = Math.max(-28, Math.min(28, this.position.x));
    this.position.z = Math.max(-72, Math.min(68, this.position.z));
  }

  _collides(x, z) {
    const r = this.radius;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (c.disabled) continue;
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) {
        return true;
      }
    }
    return false;
  }

  _syncCamera(bobOffset) {
    this.camera.position.set(this.position.x, this.eyeHeight + bobOffset, this.position.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
