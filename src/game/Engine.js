import * as THREE from 'three';
import { Player } from './Player.js';
import { ThemeManager } from './ThemeManager.js';
import { TrackManager, OBSTACLE_TYPES } from './TrackManager.js';
import { AudioManager } from './AudioManager.js';
import { ChaserBear } from './ChaserBear.js';

export class Engine {
  constructor(containerEl, callbacks) {
    this.container = containerEl;
    this.callbacks = callbacks || {};

    this.isGameActive = false;
    this.isPaused = false;

    this.score = 0;
    this.coins = 0;
    this.multiplier = 1;
    this.distance = 0;
    this.baseSpeed = 32;
    this.currentSpeed = this.baseSpeed;
    this.maxSpeed = 70;

    this.activePowerups = new Map();

    this.initScene();
    
    this.audio = new AudioManager();

    this.themeManager = new ThemeManager(this.scene);
    this.player = new Player(this.scene);
    this.bear = new ChaserBear(this.scene);
    this.trackManager = new TrackManager(this.scene, this.themeManager);

    this.initParticles();
    this.initJetpackSmoke();

    window.addEventListener('resize', () => this.onWindowResize());
    this.clock = new THREE.Clock();
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1b3824);
    this.scene.fog = new THREE.Fog(0x1b3824, 35, 150);

    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    this.cameraOffset = new THREE.Vector3(0, 4.2, 8.5);
    this.camera.position.copy(this.cameraOffset);
    this.camera.lookAt(0, 1.2, -5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.4);
    dirLight.position.set(25, 45, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);
  }

  initParticles() {
    const particleCount = 150;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 30;
      positions[i + 1] = Math.random() * 15;
      positions[i + 2] = -Math.random() * 100;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x7ca84d,
      size: 0.25,
      transparent: true,
      opacity: 0.6
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  initJetpackSmoke() {
    this.smokeCount = 60;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.smokeCount * 3);

    for (let i = 0; i < this.smokeCount * 3; i += 3) {
      positions[i] = 0;
      positions[i + 1] = -100;
      positions[i + 2] = 0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xdddddd,
      size: 0.4,
      transparent: true,
      opacity: 0.7
    });

    this.smokeParticles = new THREE.Points(geo, mat);
    this.scene.add(this.smokeParticles);
  }

  startNewGame() {
    this.isGameActive = true;
    this.isPaused = false;
    this.score = 0;
    this.coins = 0;
    this.multiplier = 1;
    this.distance = 0;
    this.currentSpeed = this.baseSpeed;
    this.activePowerups.clear();

    this.player.mesh.position.set(0, 0, 0);
    this.player.targetX = 0;
    this.player.currentX = 0;
    this.player.currentLane = 1;
    this.player.posY = 0;
    this.player.velY = 0;
    this.player.hasMagnet = false;
    this.player.deactivateHoverboard();
    this.player.deactivateShield();
    this.player.deactivateBullRide();
    this.player.deactivateJetpack();

    this.bear.startRun();
    this.trackManager.reset();

    this.audio.startBGM();

    this.clock.start();
    this.animate();
  }

  pauseGame() {
    this.isPaused = true;
    this.audio.stopBGM();
  }

  resumeGame() {
    this.isPaused = false;
    this.audio.startBGM();
    this.clock.getDelta();
    this.animate();
  }

  triggerHoverboard() {
    if (this.isGameActive && !this.isPaused && !this.player.hasHoverboard && !this.player.isRidingBull) {
      this.player.activateHoverboard();
      this.audio.playBoardActivate();
      if (this.callbacks.onHoverboardUsed) this.callbacks.onHoverboardUsed();
    }
  }

  triggerLeft() {
    if (this.isGameActive && !this.isPaused) {
      if (this.player.moveLeft()) this.audio.playLaneSwitch();
    }
  }

  triggerRight() {
    if (this.isGameActive && !this.isPaused) {
      if (this.player.moveRight()) this.audio.playLaneSwitch();
    }
  }

  triggerJump() {
    if (this.isGameActive && !this.isPaused) {
      if (this.player.jump()) this.audio.playJump();
    }
  }

  triggerSlide() {
    if (this.isGameActive && !this.isPaused) {
      if (this.player.slide()) this.audio.playSlide();
    }
  }

  updatePowerups(delta) {
    this.activePowerups.forEach((data, typeKey) => {
      data.remaining -= delta;
      if (data.remaining <= 0) {
        this.activePowerups.delete(typeKey);
        if (typeKey === 'multiplier') this.multiplier = 1;
        if (typeKey === 'magnet') this.player.hasMagnet = false;
        if (typeKey === 'shield') this.player.deactivateShield();
        if (typeKey === 'bull') this.player.deactivateBullRide();
        if (typeKey === 'jetpack') this.player.deactivateJetpack();
      }
    });

    if (this.callbacks.onPowerupsUpdate) {
      this.callbacks.onPowerupsUpdate(Array.from(this.activePowerups.values()));
    }
  }

  grantPowerup(powerup) {
    if (powerup.id === 'bull') {
      this.player.activateBullRide(powerup.duration);
      this.audio.playBullActivate();
    } else if (powerup.id === 'multiplier') {
      this.multiplier = 2;
      this.audio.playPowerup();
    } else if (powerup.id === 'magnet') {
      this.player.hasMagnet = true;
      this.audio.playPowerup();
    } else if (powerup.id === 'shield') {
      this.player.activateShield();
      this.audio.playPowerup();
    } else if (powerup.id === 'jetpack') {
      this.player.activateJetpack(powerup.duration);
      this.audio.playPowerup();
    } else if (powerup.id === 'hoverboard') {
      this.triggerHoverboard();
    }

    if (powerup.duration > 0) {
      this.activePowerups.set(powerup.id, {
        id: powerup.id,
        icon: powerup.icon,
        total: powerup.duration,
        remaining: powerup.duration
      });
    }
  }

  checkCollisions() {
    const playerX = this.player.currentX;
    const playerY = this.player.posY;
    const playerZ = this.player.mesh.position.z;

    this.trackManager.activeCoins.forEach(coin => {
      if (!coin.collected) {
        const coinPos = coin.mesh.position;
        const dx = Math.abs(coinPos.x - playerX);
        const dy = Math.abs(coinPos.y - (playerY + 1.0));
        const dz = Math.abs(coinPos.z - playerZ);

        if (dx < 1.4 && dy < 1.8 && dz < 1.8) {
          coin.collected = true;
          this.coins++;
          this.score += 50 * this.multiplier;
          this.audio.playCoin();
          coin.mesh.visible = false;
        }
      }
    });

    this.trackManager.activePowerups.forEach(p => {
      if (!p.collected) {
        const pPos = p.mesh.position;
        const dx = Math.abs(pPos.x - playerX);
        const dy = Math.abs(pPos.y - (playerY + 1.0));
        const dz = Math.abs(pPos.z - playerZ);

        if (dx < 1.5 && dy < 1.8 && dz < 1.8) {
          p.collected = true;
          p.mesh.visible = false;
          this.grantPowerup(p.type);
        }
      }
    });

    if (!this.player.isJetpackActive) {
      const playerBox = this.player.getBoundingBox();

      for (const obstacle of [...this.trackManager.activeObstacles]) {
        const obsBox = new THREE.Box3().setFromObject(obstacle.mesh);

        if (playerBox.intersectsBox(obsBox)) {
          if (this.player.isRidingBull) {
            this.trackManager.smashObstacle(obstacle);
            this.audio.playSmash();
            this.score += 200 * this.multiplier;
            return;
          }

          if (this.player.hasHoverboard) {
            this.player.deactivateHoverboard();
            this.audio.playCrash();
            this.scene.remove(obstacle.mesh);
            obstacle.mesh.position.z = 999;
            return;
          }

          if (this.player.hasShield) {
            this.player.deactivateShield();
            this.activePowerups.delete('shield');
            this.audio.playCrash();
            this.scene.remove(obstacle.mesh);
            obstacle.mesh.position.z = 999;
            return;
          }

          if (obstacle.type === OBSTACLE_TYPES.TRUCK) {
            this.gameOver();
            return;
          }

          if (!this.bear.isDangerouslyClose()) {
            this.bear.stumble();
            this.audio.playBearRoar();
            this.scene.remove(obstacle.mesh);
            obstacle.mesh.position.z = 999;
            return;
          }

          this.gameOver();
          return;
        }
      }
    }
  }

  gameOver() {
    this.isGameActive = false;
    this.audio.playCrash();
    this.audio.stopBGM();

    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver({
        score: Math.floor(this.score),
        coins: this.coins,
        distance: Math.floor(this.distance)
      });
    }
  }

  animate() {
    if (!this.isGameActive || this.isPaused) return;

    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.currentSpeed < this.maxSpeed) {
      this.currentSpeed += delta * 0.55;
    }

    this.distance += this.currentSpeed * delta;
    this.score += this.currentSpeed * delta * 2 * this.multiplier;

    // 🎵 Sync Dynamic Accelerating BGM Tempo & Powerup Music Shifts
    this.audio.updateBGMTempo(this.currentSpeed, this.player.isJetpackActive, this.player.isRidingBull);

    this.player.update(delta, this.currentSpeed);
    this.bear.update(this.player.mesh.position, this.currentSpeed, delta);

    const moveZ = this.currentSpeed * delta;
    this.scene.children.forEach(child => {
      if (child !== this.player.mesh && child !== this.bear.mesh && child !== this.particles && child !== this.smokeParticles && child.type === 'Group') {
        child.position.z += moveZ;
      }
    });

    this.trackManager.update(this.player, this.player.mesh.position.z, this.currentSpeed, delta);

    if (this.smokeParticles) {
      const pos = this.smokeParticles.geometry.attributes.position.array;
      if (this.player.isJetpackActive) {
        for (let i = 0; i < pos.length; i += 3) {
          if (pos[i + 1] < 0) {
            pos[i] = this.player.currentX + (Math.random() - 0.5) * 0.4;
            pos[i + 1] = this.player.posY + 0.8;
            pos[i + 2] = this.player.mesh.position.z + 0.5;
          } else {
            pos[i + 2] += moveZ * 1.4;
            pos[i + 1] -= delta * 1.5;
            if (pos[i + 2] > this.player.mesh.position.z + 12) {
              pos[i + 1] = -100;
            }
          }
        }
      } else {
        for (let i = 1; i < pos.length; i += 3) pos[i] = -100;
      }
      this.smokeParticles.geometry.attributes.position.needsUpdate = true;
    }

    this.updatePowerups(delta);
    this.checkCollisions();

    const targetCamX = this.player.currentX * 0.5;
    const targetCamY = this.player.posY + (this.player.isRidingBull ? 4.8 : 4.0);
    this.camera.position.x += (targetCamX - this.camera.position.x) * 6 * delta;
    this.camera.position.y += (targetCamY - this.camera.position.y) * 6 * delta;
    this.camera.position.z = this.player.mesh.position.z + 8.2;

    const targetFOV = 65 + (this.currentSpeed - this.baseSpeed) * 0.3;
    this.camera.fov += (targetFOV - this.camera.fov) * delta * 2;
    this.camera.updateProjectionMatrix();

    const pos = this.particles.geometry.attributes.position.array;
    for (let i = 2; i < pos.length; i += 3) {
      pos[i] += this.currentSpeed * delta * 1.5;
      if (pos[i] > 10) pos[i] = -100;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);

    if (this.callbacks.onHUDUpdate) {
      this.callbacks.onHUDUpdate({
        score: Math.floor(this.score),
        coins: this.coins,
        multiplier: this.multiplier,
        speedPercent: Math.min(100, Math.floor((this.currentSpeed / this.maxSpeed) * 100))
      });
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
