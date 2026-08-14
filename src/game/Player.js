import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const CHARACTERS = {
  SKELETON: {
    id: 'skeleton',
    name: 'CZAR',
    icon: '💀',
    defaultColor: '#7ca84d',
    secondaryColor: '#3a3d45',
    desc: 'Cybernetic skull runner with beanie, red X eyepatch, silver chain & wire spine.',
    glbPath: '/czar.glb'
  },
  ILKERY: {
    id: 'ilkery',
    name: 'ILKERY',
    icon: '🐯',
    defaultColor: '#e868a2',
    secondaryColor: '#d63031',
    desc: 'Wild 3-eyed mutant tiger runner with BE KIND REWIND shirt & floating cap.',
    glbPath: '/illkery.glb'
  },
  MODEX: {
    id: 'modex',
    name: 'MODEX',
    icon: '⚡',
    defaultColor: '#70d6ff',
    secondaryColor: '#9b5de5',
    desc: 'Anime cyber runner with cyan hair, yellow visor & glowing purple neck veins.',
    glbPath: '/modex.glb'
  }
};

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    this.currentCharacter = CHARACTERS.SKELETON;
    this.accentColor = CHARACTERS.SKELETON.defaultColor;

    this.gltfScenes = {};
    this.gltfLoader = new GLTFLoader();

    this.lanes = [-3.2, 0, 3.2];
    this.currentLane = 1;
    this.targetX = 0;
    this.currentX = 0;
    
    this.posY = 0;
    this.velY = 0;
    this.gravity = -38;
    this.jumpForce = 13.5;
    this.isGrounded = true;

    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.7;

    this.hasShield = false;
    this.hasHoverboard = false;
    this.isJetpackActive = false;
    this.jetpackTimer = 0;

    this.isRidingBull = false;
    this.bullTimer = 0;

    this.animTime = 0;

    // Load 3D GLB Models immediately
    this.loadGLTFModels();
    this.buildCharacterMesh();
  }

  loadGLTFModels() {
    Object.values(CHARACTERS).forEach(char => {
      if (char.glbPath) {
        this.gltfLoader.load(
          char.glbPath,
          (gltf) => {
            const loadedModel = gltf.scene;

            // Enable shadow casting and material rendering
            loadedModel.traverse(child => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                if (child.material) {
                  child.material.side = THREE.DoubleSide;
                  child.material.needsUpdate = true;
                }
              }
            });

            // Normalize size so character height is ~2.2 units
            const bbox = new THREE.Box3().setFromObject(loadedModel);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            const targetScale = 2.2 / maxDim;
            loadedModel.scale.set(targetScale, targetScale, targetScale);

            // Position feet at bottom pivot
            const newBox = new THREE.Box3().setFromObject(loadedModel);
            loadedModel.position.y = -newBox.min.y;

            // Store GLTF Scene
            this.gltfScenes[char.id] = loadedModel;

            // If this is the currently selected character, update mesh immediately
            if (this.currentCharacter.id === char.id) {
              this.buildCharacterMesh();
            }
          },
          undefined,
          (err) => {
            console.warn(`GLTF Load error for ${char.name}:`, err);
          }
        );
      }
    });
  }

  setAccentColor(colorHex) {
    this.accentColor = colorHex;
    this.buildCharacterMesh();
  }

  setCharacter(charId) {
    const found = Object.values(CHARACTERS).find(c => c.id === charId);
    if (found) {
      this.currentCharacter = found;
      this.accentColor = found.defaultColor;
      this.buildCharacterMesh();
    }
  }

  setCustomTextures(charTex, coinTex) {
    this.customCharTexture = charTex;
    this.customCoinTexture = coinTex;
    this.buildCharacterMesh();
  }

  // 🎮 REAL 3D GLB MODEL RUNNER MESH SYSTEM
  buildCharacterMesh() {
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    const charId = this.currentCharacter.id;
    const gltfModel = this.gltfScenes[charId];

    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 0;
    this.mesh.add(this.bodyGroup);

    if (gltfModel) {
      // 🚀 RENDER REAL 3D GLB MODEL (Direct Scene Attachment for 100% Fidelity)
      this.bodyGroup.add(gltfModel);
    } else {
      // High-Detail 3D Sculpted Fallback while GLB finishes loading
      if (charId === 'ilkery') {
        this.buildIlkerYFallback();
      } else if (charId === 'modex') {
        this.buildModeXFallback();
      } else {
        this.buildCzarFallback();
      }
    }

    // 🚀 3D BACK-ATTACHED ROCKET JETPACK MESH
    this.jetpackMesh = new THREE.Group();
    const rocketMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, metalness: 0.8, roughness: 0.2 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    [-0.25, 0.25].forEach(rx => {
      const tubeGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.75, 16);
      const tube = new THREE.Mesh(tubeGeo, rocketMat);
      tube.position.x = rx;
      tube.castShadow = true;
      this.jetpackMesh.add(tube);

      const flameGeo = new THREE.ConeGeometry(0.11, 0.35, 12);
      flameGeo.rotateX(Math.PI);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(rx, -0.55, 0);
      this.jetpackMesh.add(flame);
    });

    this.jetpackMesh.position.set(0, 1.2, -0.28);
    this.jetpackMesh.visible = false;
    this.bodyGroup.add(this.jetpackMesh);

    // 🐂 RAGING BULL MESH
    this.bullMesh = new THREE.Group();
    const bullMat = new THREE.MeshStandardMaterial({ color: 0x331c0e, roughness: 0.5, metalness: 0.3 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.2, metalness: 0.9 });
    const bullEyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    const bullTorsoGeo = new THREE.CapsuleGeometry(0.65, 1.4, 16, 24);
    bullTorsoGeo.rotateX(Math.PI / 2);
    const bullTorso = new THREE.Mesh(bullTorsoGeo, bullMat);
    bullTorso.castShadow = true;
    this.bullMesh.add(bullTorso);

    const bullHumpGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const bullHump = new THREE.Mesh(bullHumpGeo, bullMat);
    bullHump.position.set(0, 0.4, -0.3);
    bullTorso.add(bullHump);

    const bullHeadGeo = new THREE.SphereGeometry(0.48, 20, 20);
    const bullHead = new THREE.Mesh(bullHeadGeo, bullMat);
    bullHead.position.set(0, 0.3, -1.2);
    bullHead.castShadow = true;
    this.bullMesh.add(bullHead);

    [-0.45, 0.45].forEach(hx => {
      const hornGeo = new THREE.ConeGeometry(0.14, 0.9, 16);
      hornGeo.rotateX(-Math.PI / 3);
      hornGeo.rotateZ(hx > 0 ? 0.3 : -0.3);
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(hx, 0.35, -0.2);
      bullHead.add(horn);
    });

    [-0.28, 0.28].forEach(hx => {
      const eyeGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const eye = new THREE.Mesh(eyeGeo, bullEyeMat);
      eye.position.set(hx, 0.15, -0.4);
      bullHead.add(eye);
    });

    const bullLegGeo = new THREE.CapsuleGeometry(0.18, 0.7, 12, 12);
    this.bullFrontLeft = new THREE.Mesh(bullLegGeo, bullMat);
    this.bullFrontLeft.position.set(-0.45, -0.7, -0.7);
    this.bullMesh.add(this.bullFrontLeft);

    this.bullFrontRight = new THREE.Mesh(bullLegGeo, bullMat);
    this.bullFrontRight.position.set(0.45, -0.7, -0.7);
    this.bullMesh.add(this.bullFrontRight);

    this.bullBackLeft = new THREE.Mesh(bullLegGeo, bullMat);
    this.bullBackLeft.position.set(-0.45, -0.7, 0.7);
    this.bullMesh.add(this.bullBackLeft);

    this.bullBackRight = new THREE.Mesh(bullLegGeo, bullMat);
    this.bullBackRight.position.set(0.45, -0.7, 0.7);
    this.bullMesh.add(this.bullBackRight);

    this.bullMesh.position.y = 0.6;
    this.bullMesh.visible = false;
    this.mesh.add(this.bullMesh);

    // 🛹 3D TECH SKATEBOARD / HOVERBOARD MESH
    this.hoverboardMesh = new THREE.Group();
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x11162b, metalness: 0.8, roughness: 0.2 });
    const edgeMat = new THREE.MeshBasicMaterial({ color: parseInt(this.accentColor.replace('#', '0x')) });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.9, roughness: 0.1 });

    const deckGeo = new THREE.BoxGeometry(0.68, 0.06, 1.6);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.castShadow = true;
    this.hoverboardMesh.add(deck);

    const noseGeo = new THREE.BoxGeometry(0.68, 0.06, 0.3);
    const nose = new THREE.Mesh(noseGeo, deckMat);
    nose.position.set(0, 0.06, -0.9);
    nose.rotation.x = -0.3;
    this.hoverboardMesh.add(nose);

    const tail = new THREE.Mesh(noseGeo, deckMat);
    tail.position.set(0, 0.06, 0.9);
    tail.rotation.x = 0.3;
    this.hoverboardMesh.add(tail);

    [-0.35, 0.35].forEach(ex => {
      const trimGeo = new THREE.BoxGeometry(0.04, 0.08, 1.8);
      const trim = new THREE.Mesh(trimGeo, edgeMat);
      trim.position.set(ex, 0, 0);
      this.hoverboardMesh.add(trim);
    });

    [-0.55, 0.55].forEach(z => {
      const truckAxleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
      truckAxleGeo.rotateZ(Math.PI / 2);
      const truckAxle = new THREE.Mesh(truckAxleGeo, deckMat);
      truckAxle.position.set(0, -0.08, z);
      this.hoverboardMesh.add(truckAxle);

      [-0.28, 0.28].forEach(wx => {
        const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(wx, -0.08, z);
        this.hoverboardMesh.add(wheel);
      });
    });

    this.hoverboardMesh.position.y = -0.1;
    this.hoverboardMesh.visible = false;
    this.bodyGroup.add(this.hoverboardMesh);

    // Energy Shield
    const shieldGeo = new THREE.SphereGeometry(1.4, 32, 32);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00f3ff,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1
    });
    this.shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.shieldMesh.position.y = 1.0;
    this.shieldMesh.visible = false;
    this.bodyGroup.add(this.shieldMesh);
  }

  buildCzarFallback() {
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xe0e0d0, roughness: 0.4 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x42464e, roughness: 0.4 });
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
    const eyepatchMat = new THREE.MeshStandardMaterial({ color: 0xcc1100 });

    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 16), boneMat);
    spine.position.y = 0.5;
    this.bodyGroup.add(spine);

    [-0.28, 0.28].forEach((jx, idx) => {
      const flap = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.75, 12, 12), jacketMat);
      flap.position.set(jx, 0.5, 0);
      flap.rotation.y = idx === 0 ? 0.25 : -0.25;
      this.bodyGroup.add(flap);
    });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), boneMat);
    head.position.y = 1.25;
    this.bodyGroup.add(head);

    const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6), beanieMat);
    beanie.position.y = 1.33;
    this.bodyGroup.add(beanie);

    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.04), eyepatchMat);
    patch.position.set(-0.11, 1.3, 0.26);
    this.bodyGroup.add(patch);
  }

  buildIlkerYFallback() {
    const tigerMat = new THREE.MeshStandardMaterial({ color: 0xe868a2, roughness: 0.5 });
    const redSkinMat = new THREE.MeshStandardMaterial({ color: 0xd63031 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x4a4e5a, roughness: 0.6 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.75, 16, 16), shirtMat);
    torso.position.y = 0.5;
    this.bodyGroup.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), tigerMat);
    head.position.y = 1.25;
    this.bodyGroup.add(head);

    [-0.1, 0, 0.1].forEach((ex, idx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.set(ex, 1.3 + (idx === 1 ? 0.08 : 0), 0.26);
      this.bodyGroup.add(eye);
    });
  }

  buildModeXFallback() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5b4c });
    const cyanHairMat = new THREE.MeshStandardMaterial({ color: 0x70d6ff });
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.75, 16, 16), new THREE.MeshStandardMaterial({ color: 0xf8f9fa }));
    torso.position.y = 0.5;
    this.bodyGroup.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 24), skinMat);
    head.position.y = 1.25;
    this.bodyGroup.add(head);

    const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), beanieMat);
    beanie.position.y = 1.33;
    this.bodyGroup.add(beanie);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.08), visorMat);
    visor.position.set(0, 1.28, 0.22);
    this.bodyGroup.add(visor);
  }

  moveLeft() {
    if (this.currentLane > 0) {
      this.currentLane--;
      this.targetX = this.lanes[this.currentLane];
      return true;
    }
    return false;
  }

  moveRight() {
    if (this.currentLane < this.lanes.length - 1) {
      this.currentLane++;
      this.targetX = this.lanes[this.currentLane];
      return true;
    }
    return false;
  }

  jump() {
    if (this.isGrounded || this.isJetpackActive || this.isRidingBull) {
      this.velY = this.jumpForce;
      this.isGrounded = false;
      this.isSliding = false;
      return true;
    }
    return false;
  }

  slide() {
    if (!this.isJetpackActive && !this.isRidingBull) {
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      if (!this.isGrounded) this.velY = -this.jumpForce;
      return true;
    }
    return false;
  }

  activateBullRide(duration = 10.0) {
    this.isRidingBull = true;
    this.bullTimer = duration;
    if (this.bullMesh) this.bullMesh.visible = true;
  }

  deactivateBullRide() {
    this.isRidingBull = false;
    if (this.bullMesh) this.bullMesh.visible = false;
  }

  activateHoverboard() {
    this.hasHoverboard = true;
    if (this.hoverboardMesh) this.hoverboardMesh.visible = true;
  }

  deactivateHoverboard() {
    this.hasHoverboard = false;
    if (this.hoverboardMesh) this.hoverboardMesh.visible = false;
  }

  activateShield() {
    this.hasShield = true;
    if (this.shieldMesh) this.shieldMesh.visible = true;
  }

  deactivateShield() {
    this.hasShield = false;
    if (this.shieldMesh) this.shieldMesh.visible = false;
  }

  activateJetpack(duration = 6.0) {
    this.isJetpackActive = true;
    this.jetpackTimer = duration;
    if (this.jetpackMesh) this.jetpackMesh.visible = true;
  }

  deactivateJetpack() {
    this.isJetpackActive = false;
    if (this.jetpackMesh) this.jetpackMesh.visible = false;
  }

  update(delta, runSpeed) {
    this.currentX += (this.targetX - this.currentX) * 15 * delta;
    this.mesh.position.x = this.currentX;

    const leanAngle = (this.targetX - this.currentX) * -0.15;
    this.mesh.rotation.z = leanAngle;

    if (this.isRidingBull) {
      this.bullTimer -= delta;
      if (this.bullTimer <= 0) this.deactivateBullRide();
    }

    if (this.isJetpackActive) {
      this.jetpackTimer -= delta;
      const targetY = 7.5;
      this.posY += (targetY - this.posY) * 5 * delta;
      this.mesh.position.y = this.posY;
      this.isGrounded = false;

      if (this.jetpackTimer <= 0) {
        this.deactivateJetpack();
      }
    } else {
      if (!this.isGrounded) {
        this.velY += this.gravity * delta;
        this.posY += this.velY * delta;

        if (this.posY <= 0) {
          this.posY = 0;
          this.velY = 0;
          this.isGrounded = true;
        }
      }
      this.mesh.position.y = this.posY;
    }

    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) this.isSliding = false;
    }

    this.animTime += delta * runSpeed * 0.9;

    // Smooth Running Animation for 3D GLTF Character Models
    if (this.isJetpackActive) {
      this.bodyGroup.position.y = 0;
      this.bodyGroup.rotation.x = -Math.PI / 2.2;
      this.bodyGroup.rotation.y = 0;
      this.bodyGroup.scale.set(1, 1, 1);
    } else if (this.hasHoverboard) {
      this.bodyGroup.position.y = 0.1;
      this.bodyGroup.rotation.x = 0.05;
      this.bodyGroup.rotation.y = 0.35;
      this.bodyGroup.scale.set(1, 1, 1);
    } else if (this.isRidingBull) {
      this.bodyGroup.position.y = 1.0;
      this.bodyGroup.rotation.x = 0.2;
      this.bodyGroup.rotation.y = 0;
      this.bodyGroup.scale.set(1, 1, 1);

      const bullAngle = Math.sin(this.animTime * 1.5) * 0.6;
      if (this.bullFrontLeft) {
        this.bullFrontLeft.rotation.x = bullAngle;
        this.bullBackRight.rotation.x = bullAngle;
        this.bullFrontRight.rotation.x = -bullAngle;
        this.bullBackLeft.rotation.x = -bullAngle;
      }
    } else if (this.isSliding) {
      this.bodyGroup.position.y = -0.4;
      this.bodyGroup.rotation.x = -Math.PI / 4;
      this.bodyGroup.rotation.y = 0;
      this.bodyGroup.scale.set(1, 0.5, 1);
    } else if (!this.isGrounded) {
      this.bodyGroup.position.y = 0;
      this.bodyGroup.rotation.x = -0.15;
      this.bodyGroup.rotation.y = 0;
      this.bodyGroup.scale.set(1, 1, 1);
    } else {
      // 🏃 3D GROUND RUNNING STRIDE BOUNCE & LEAN
      const bounce = Math.abs(Math.sin(this.animTime * 2.5)) * 0.18;
      const tilt = Math.sin(this.animTime * 2.5) * 0.06;
      this.bodyGroup.position.y = bounce;
      this.bodyGroup.rotation.z = tilt;
      this.bodyGroup.rotation.x = 0.05;
      this.bodyGroup.rotation.y = 0;
      this.bodyGroup.scale.set(1, 1, 1);
    }

    if (this.hasShield && this.shieldMesh) {
      this.shieldMesh.rotation.y += delta * 2;
    }
  }

  getBoundingBox() {
    const box = new THREE.Box3();
    const sizeY = this.isRidingBull ? 2.2 : (this.isSliding ? 0.7 : 2.0);
    const minY = this.mesh.position.y;
    const maxY = minY + sizeY;

    box.min.set(this.mesh.position.x - 0.5, minY, this.mesh.position.z - 0.6);
    box.max.set(this.mesh.position.x + 0.5, maxY, this.mesh.position.z + 0.6);

    return box;
  }
}
