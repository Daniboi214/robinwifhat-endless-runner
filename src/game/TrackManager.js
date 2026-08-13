import * as THREE from 'three';

export const OBSTACLE_TYPES = {
  TRUCK: 'truck',
  HURDLE_LOW: 'hurdle_low',
  HURDLE_HIGH: 'hurdle_high',
  RAMP: 'ramp',
  COIN: 'coin',
  POWERUP: 'powerup'
};

export const POWERUPS = {
  BULL: { id: 'bull', name: 'RAGING BULL', icon: '🐂', duration: 10, color: 0xffaa00 },
  MAGNET: { id: 'magnet', name: 'COIN MAGNET', icon: '🧲', duration: 10, color: 0xff0055 },
  JETPACK: { id: 'jetpack', name: 'ROCKET JETPACK', icon: '🚀', duration: 6, color: 0x00f3ff },
  SHIELD: { id: 'shield', name: 'ENERGY SHIELD', icon: '🛡️', duration: 15, color: 0x00ff66 },
  MULTIPLIER: { id: 'multiplier', name: '2X SCORE', icon: '⚡', duration: 12, color: 0xb000ff },
  HOVERBOARD: { id: 'hoverboard', name: 'HOVERBOARD', icon: '🛹', duration: 0, color: 0xffd700 }
};

export class TrackManager {
  constructor(scene, themeManager) {
    this.scene = scene;
    this.themeManager = themeManager;

    this.chunks = [];
    this.activeObstacles = [];
    this.activeCoins = [];
    this.activePowerups = [];
    this.flyingDebris = [];

    this.chunkLength = 50;
    this.visibleChunks = 10;
    this.skyLaneIndex = 1;

    // True Random Power-up Shuffle Deck (Guarantees all 6 powerups cycle evenly!)
    this.powerupDeck = [];
    this.refillPowerupDeck();

    this.coinCapGeo = new THREE.CircleGeometry(0.55, 32);
    this.coinRimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 32, 1, true);
  }

  refillPowerupDeck() {
    const list = Object.values(POWERUPS);
    // Fisher-Yates Shuffle
    this.powerupDeck = [...list];
    for (let i = this.powerupDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.powerupDeck[i], this.powerupDeck[j]] = [this.powerupDeck[j], this.powerupDeck[i]];
    }
  }

  getNextPowerup() {
    if (this.powerupDeck.length === 0) {
      this.refillPowerupDeck();
    }
    return this.powerupDeck.pop();
  }

  createCoinMesh() {
    const coinGroup = new THREE.Group();

    const frontCap = new THREE.Mesh(this.coinCapGeo, this.themeManager.materials.coinFace);
    frontCap.position.z = 0.06;
    coinGroup.add(frontCap);

    const backCap = new THREE.Mesh(this.coinCapGeo, this.themeManager.materials.coinFace);
    backCap.position.z = -0.06;
    backCap.rotation.y = Math.PI;
    coinGroup.add(backCap);

    const rim = new THREE.Mesh(this.coinRimGeo, this.themeManager.materials.coinRim);
    rim.rotation.x = Math.PI / 2;
    coinGroup.add(rim);

    return coinGroup;
  }

  reset() {
    this.chunks.forEach(c => this.scene.remove(c));
    this.activeObstacles.forEach(o => this.scene.remove(o.mesh));
    this.activeCoins.forEach(c => this.scene.remove(c.mesh));
    this.activePowerups.forEach(p => this.scene.remove(p.mesh));
    this.flyingDebris.forEach(d => this.scene.remove(d.mesh));

    this.chunks = [];
    this.activeObstacles = [];
    this.activeCoins = [];
    this.activePowerups = [];
    this.flyingDebris = [];
    this.skyLaneIndex = 1;
    this.refillPowerupDeck();

    for (let i = 0; i < this.visibleChunks; i++) {
      this.generateChunk(i > 1);
    }
  }

  generateChunk(spawnHazards = true) {
    const chunk = this.themeManager.createRoadChunkGeometry();
    
    if (this.chunks.length > 0) {
      const lastChunk = this.chunks[this.chunks.length - 1];
      chunk.position.z = lastChunk.position.z - this.chunkLength;
    } else {
      chunk.position.z = 20;
    }

    this.scene.add(chunk);
    this.chunks.push(chunk);

    if (spawnHazards) {
      this.populateChunkHazards(chunk.position.z);
    }
  }

  // 🛡️ RARE & SHUFFLED POWER-UP SPAWNING
  populateChunkHazards(chunkZ) {
    const lanes = [-3.2, 0, 3.2];
    const safeLaneIndex = Math.floor(Math.random() * lanes.length);

    lanes.forEach((laneX, idx) => {
      const zPos = chunkZ + (Math.random() * 16 - 8);

      if (idx === safeLaneIndex) {
        // Safe lane: 82% coins, 18% rare shuffled powerup!
        if (Math.random() < 0.82) {
          this.spawnCoinArc(laneX, zPos);
        } else {
          this.spawnDistinctPowerup(laneX, zPos);
        }
      } else {
        const rand = Math.random();
        if (rand < 0.35) {
          this.spawnTruck(laneX, zPos);
        } else if (rand < 0.65) {
          this.spawnLowHurdle(laneX, zPos);
        } else {
          this.spawnHighHurdle(laneX, zPos);
        }
      }
    });
  }

  spawnJetpackSkyTrail(playerZ) {
    const lanes = [-3.2, 0, 3.2];
    this.skyLaneIndex = (this.skyLaneIndex + (Math.random() > 0.5 ? 1 : 2)) % 3;
    const currentSkyX = lanes[this.skyLaneIndex];

    for (let i = 1; i <= 3; i++) {
      const z = playerZ - (i * 6.0);
      this.spawnSingleCoin(currentSkyX, 7.5, z);
    }
  }

  spawnTruck(x, z) {
    const truckGroup = new THREE.Group();
    
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x8b3a1b, roughness: 0.5, metalness: 0.3 });
    const logMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });

    const cabinGeo = new THREE.BoxGeometry(2.4, 1.5, 3.0);
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.75, -2.5);
    cabin.castShadow = true;
    truckGroup.add(cabin);

    const flatbedGeo = new THREE.BoxGeometry(2.4, 0.3, 5.0);
    const flatbed = new THREE.Mesh(flatbedGeo, cabinMat);
    flatbed.position.set(0, 0.3, 1.5);
    flatbed.castShadow = true;
    truckGroup.add(flatbed);

    [-0.6, 0.6].forEach(lx => {
      const logGeo = new THREE.CylinderGeometry(0.4, 0.4, 4.8, 16);
      logGeo.rotateX(Math.PI / 2);
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.set(lx, 0.8, 1.5);
      log.castShadow = true;
      truckGroup.add(log);
    });

    const topLogGeo = new THREE.CylinderGeometry(0.38, 0.38, 4.8, 16);
    topLogGeo.rotateX(Math.PI / 2);
    const topLog = new THREE.Mesh(topLogGeo, logMat);
    topLog.position.set(0, 1.3, 1.5);
    topLog.castShadow = true;
    truckGroup.add(topLog);

    [-1.25, 1.25].forEach(wx => {
      [-2.5, 0.5, 2.5].forEach(wz => {
        const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(wx, 0.35, wz);
        truckGroup.add(wheel);
      });
    });

    truckGroup.position.set(x, 0, z);
    this.scene.add(truckGroup);

    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(truckGroup);

    this.activeObstacles.push({
      type: OBSTACLE_TYPES.TRUCK,
      mesh: truckGroup,
      box: boundingBox
    });
  }

  spawnLowHurdle(x, z) {
    const hurdleGroup = new THREE.Group();
    const barGeo = new THREE.CylinderGeometry(0.35, 0.35, 2.8, 16);
    barGeo.rotateZ(Math.PI / 2);
    const bar = new THREE.Mesh(barGeo, this.themeManager.materials.hurdleLow);
    bar.position.y = 0.45;
    bar.castShadow = true;
    hurdleGroup.add(bar);

    hurdleGroup.position.set(x, 0, z);
    this.scene.add(hurdleGroup);

    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(hurdleGroup);

    this.activeObstacles.push({
      type: OBSTACLE_TYPES.HURDLE_LOW,
      mesh: hurdleGroup,
      box: boundingBox
    });
  }

  spawnHighHurdle(x, z) {
    const hurdleGroup = new THREE.Group();
    const topGeo = new THREE.CapsuleGeometry(0.28, 2.6, 12, 12);
    topGeo.rotateZ(Math.PI / 2);
    const topBar = new THREE.Mesh(topGeo, this.themeManager.materials.hurdleHigh);
    topBar.position.y = 1.55;
    topBar.castShadow = true;
    hurdleGroup.add(topBar);

    [-1.3, 1.3].forEach(px => {
      const postGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 12);
      const post = new THREE.Mesh(postGeo, this.themeManager.materials.hurdleHigh);
      post.position.set(px, 0.9, 0);
      post.castShadow = true;
      hurdleGroup.add(post);
    });

    hurdleGroup.position.set(x, 0, z);
    this.scene.add(hurdleGroup);

    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(hurdleGroup);

    this.activeObstacles.push({
      type: OBSTACLE_TYPES.HURDLE_HIGH,
      mesh: hurdleGroup,
      box: boundingBox
    });
  }

  spawnCoinArc(x, zStart) {
    const coinCount = 5;
    for (let i = 0; i < coinCount; i++) {
      const arcY = Math.sin((i / coinCount) * Math.PI) * 1.5 + 1.0;
      this.spawnSingleCoin(x, arcY, zStart + i * 2.5);
    }
  }

  spawnSingleCoin(x, y, z) {
    const coinMesh = this.createCoinMesh();
    coinMesh.position.set(x, y, z);
    this.scene.add(coinMesh);

    this.activeCoins.push({
      mesh: coinMesh,
      x: x,
      y: y,
      z: z,
      collected: false
    });
  }

  spawnDistinctPowerup(x, z) {
    // Pick next item from true shuffle deck (guarantees equal distribution & no repeats!)
    const selected = this.getNextPowerup();

    const pGroup = new THREE.Group();

    const auraGeo = new THREE.TorusGeometry(0.7, 0.08, 16, 32);
    const auraMat = new THREE.MeshBasicMaterial({ color: selected.color, wireframe: true });
    const aura = new THREE.Mesh(auraGeo, auraMat);
    aura.position.y = 1.2;
    pGroup.add(aura);

    let iconMesh;

    if (selected.id === 'jetpack') {
      iconMesh = new THREE.Group();
      const rocketMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, metalness: 0.8, roughness: 0.2 });
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

      [-0.2, 0.2].forEach(rx => {
        const tubeGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 16);
        const tube = new THREE.Mesh(tubeGeo, rocketMat);
        tube.position.x = rx;
        iconMesh.add(tube);

        const flameGeo = new THREE.ConeGeometry(0.1, 0.3, 12);
        flameGeo.rotateX(Math.PI);
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(rx, -0.45, 0);
        iconMesh.add(flame);
      });
    } else if (selected.id === 'magnet') {
      iconMesh = new THREE.Group();
      const magMat = new THREE.MeshStandardMaterial({ color: 0xff0055, metalness: 0.5, roughness: 0.3 });
      const tipMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.9, roughness: 0.1 });

      const arcGeo = new THREE.TorusGeometry(0.3, 0.1, 12, 24, Math.PI);
      const arc = new THREE.Mesh(arcGeo, magMat);
      iconMesh.add(arc);

      [-0.3, 0.3].forEach(mx => {
        const tipGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 12);
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(mx, -0.2, 0);
        iconMesh.add(tip);
      });
    } else if (selected.id === 'bull') {
      iconMesh = new THREE.Group();
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.2 });
      const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
      const head = new THREE.Mesh(headGeo, goldMat);
      iconMesh.add(head);

      [-0.35, 0.35].forEach(hx => {
        const hornGeo = new THREE.ConeGeometry(0.1, 0.4, 12);
        hornGeo.rotateZ(hx > 0 ? -0.4 : 0.4);
        const horn = new THREE.Mesh(hornGeo, goldMat);
        horn.position.set(hx, 0.25, 0);
        head.add(horn);
      });
    } else if (selected.id === 'shield') {
      const shieldGeo = new THREE.SphereGeometry(0.4, 20, 20);
      const shieldMat = new THREE.MeshStandardMaterial({ color: 0x00ff66, emissive: 0x00ff66, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 });
      iconMesh = new THREE.Mesh(shieldGeo, shieldMat);
    } else {
      const boltGeo = new THREE.ConeGeometry(0.25, 0.7, 4);
      const boltMat = new THREE.MeshStandardMaterial({ color: 0xb000ff, emissive: 0xb000ff, emissiveIntensity: 0.8 });
      iconMesh = new THREE.Mesh(boltGeo, boltMat);
    }

    iconMesh.position.y = 1.2;
    pGroup.add(iconMesh);

    pGroup.position.set(x, 0, z);
    this.scene.add(pGroup);

    this.activePowerups.push({
      type: selected,
      mesh: pGroup,
      aura: aura,
      iconMesh: iconMesh,
      collected: false
    });
  }

  smashObstacle(obstacle) {
    const idx = this.activeObstacles.indexOf(obstacle);
    if (idx !== -1) {
      this.activeObstacles.splice(idx, 1);

      this.flyingDebris.push({
        mesh: obstacle.mesh,
        velX: (Math.random() - 0.5) * 16,
        velY: 16 + Math.random() * 10,
        velZ: -15 - Math.random() * 10,
        rotX: Math.random() * 10,
        rotY: Math.random() * 10
      });
    }
  }

  update(player, playerZ, runSpeed, delta) {
    if (this.chunks.length > 0) {
      const firstChunk = this.chunks[0];
      if (firstChunk.position.z > playerZ + 30) {
        this.scene.remove(firstChunk);
        this.chunks.shift();
        this.generateChunk(true);
      }
    }

    if (player.isJetpackActive && Math.random() < 0.08) {
      this.spawnJetpackSkyTrail(playerZ);
    }

    this.activeCoins.forEach(coin => {
      if (!coin.collected) {
        coin.mesh.rotation.y += delta * 3.5;
        
        if (player.hasMagnet) {
          const dist = coin.mesh.position.distanceTo(player.mesh.position);
          if (dist < 16) {
            coin.mesh.position.lerp(player.mesh.position, delta * 15);
          }
        }
      }
    });

    this.activePowerups.forEach(p => {
      if (!p.collected) {
        p.mesh.rotation.y += delta * 3;
        if (p.aura) p.aura.rotation.z += delta * 4;
        p.mesh.position.y = Math.sin(Date.now() * 0.005) * 0.2 + 0.2;
      }
    });

    this.flyingDebris.forEach(d => {
      d.mesh.position.x += d.velX * delta;
      d.mesh.position.y += d.velY * delta;
      d.mesh.position.z += d.velZ * delta;
      d.velY -= 35 * delta;

      d.mesh.rotation.x += d.rotX * delta;
      d.mesh.rotation.y += d.rotY * delta;
    });

    this.flyingDebris = this.flyingDebris.filter(d => {
      if (d.mesh.position.y < -10 || d.mesh.position.z > playerZ + 50) {
        this.scene.remove(d.mesh);
        return false;
      }
      return true;
    });

    this.activeObstacles = this.activeObstacles.filter(o => {
      if (o.mesh.position.z > playerZ + 20) {
        this.scene.remove(o.mesh);
        return false;
      }
      return true;
    });

    this.activeCoins = this.activeCoins.filter(c => {
      if (c.mesh.position.z > playerZ + 20 || c.collected) {
        this.scene.remove(c.mesh);
        return false;
      }
      return true;
    });

    this.activePowerups = this.activePowerups.filter(p => {
      if (p.mesh.position.z > playerZ + 20 || p.collected) {
        this.scene.remove(p.mesh);
        return false;
      }
      return true;
    });
  }
}
