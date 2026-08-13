import * as THREE from 'three';

export const CHARACTERS = {
  SKELETON: {
    id: 'skeleton',
    name: 'CZAR',
    icon: '💀',
    defaultColor: '#7ca84d',
    secondaryColor: '#3a3d45',
    desc: 'Cybernetic skull runner with beanie, red X eyepatch, silver chain & wire spine.'
  },
  NINJA: {
    id: 'ninja',
    name: 'NEON SHADOW',
    icon: '🥷',
    defaultColor: '#00f3ff',
    secondaryColor: '#11162b',
    desc: 'Cybernetic shadow runner with glowing energy blade & thruster boots.'
  },
  MECH: {
    id: 'mech',
    name: 'ASTRO MECH',
    icon: '🤖',
    defaultColor: '#ff0055',
    secondaryColor: '#1f2430',
    desc: 'Heavy robotic exo-suit with high-thruster boots.'
  },
  SYNTH: {
    id: 'synth',
    name: 'SYNTH RIDER',
    icon: '🕶️',
    defaultColor: '#b000ff',
    secondaryColor: '#1a0933',
    desc: 'Retro synthwave runner with glowing hover shades.'
  }
};

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    this.currentCharacter = CHARACTERS.SKELETON;
    this.accentColor = CHARACTERS.SKELETON.defaultColor;

    this.customCharTexture = null;
    this.customCoinTexture = null;

    const loader = new THREE.TextureLoader();
    loader.load('/czar_character.jpg', (tex) => {
      this.customCharTexture = tex;
      this.buildCharacterMesh();
    }, undefined, () => {});

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

    this.buildCharacterMesh();
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

  buildCharacterMesh() {
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xe0e0d0,
      roughness: 0.4,
      metalness: 0.2
    });

    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0x42464e,
      roughness: 0.4,
      metalness: 0.3
    });

    if (this.customCharTexture) {
      jacketMat.map = this.customCharTexture;
      jacketMat.needsUpdate = true;
    }

    const beanieMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.9,
      metalness: 0.05
    });

    const eyepatchMat = new THREE.MeshStandardMaterial({
      color: 0xcc1100,
      roughness: 0.3
    });

    const chainMat = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      metalness: 0.95,
      roughness: 0.1
    });

    const wireColors = [0xff0000, 0x00f3ff, 0x00ff66, 0xffff00];

    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 1.1;
    this.mesh.add(this.bodyGroup);

    // 1. 💀 TORSO & WIRE SPINE
    const spineGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.85, 16);
    const spine = new THREE.Mesh(spineGeo, boneMat);
    spine.position.y = 0.1;
    spine.castShadow = true;
    this.bodyGroup.add(spine);

    wireColors.forEach((color, idx) => {
      const wireGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.88, 8);
      const wireMat = new THREE.MeshBasicMaterial({ color: color });
      const wire = new THREE.Mesh(wireGeo, wireMat);
      const angle = (idx / wireColors.length) * Math.PI * 2;
      wire.position.set(Math.cos(angle) * 0.05, 0.1, Math.sin(angle) * 0.05);
      this.bodyGroup.add(wire);
    });

    [-0.28, 0.28].forEach((jx, idx) => {
      const flapGeo = new THREE.CapsuleGeometry(0.12, 0.75, 12, 12);
      const flap = new THREE.Mesh(flapGeo, jacketMat);
      flap.position.set(jx, 0.1, 0);
      flap.rotation.y = idx === 0 ? 0.25 : -0.25;
      flap.castShadow = true;
      this.bodyGroup.add(flap);
    });

    const chainGeo = new THREE.TorusGeometry(0.24, 0.035, 12, 24);
    chainGeo.rotateX(Math.PI / 3);
    const chain = new THREE.Mesh(chainGeo, chainMat);
    chain.position.set(0, 0.45, 0.06);
    this.bodyGroup.add(chain);

    // 2. 💀 SKULL HEAD & BEANIE & EYEPATCH
    const skullHeadGeo = new THREE.SphereGeometry(0.3, 24, 24);
    this.head = new THREE.Mesh(skullHeadGeo, boneMat);
    this.head.position.y = 0.82;
    this.head.castShadow = true;
    this.bodyGroup.add(this.head);

    [-0.11, 0.11].forEach(ex => {
      const socketGeo = new THREE.SphereGeometry(0.07, 12, 12);
      const socketMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const socket = new THREE.Mesh(socketGeo, socketMat);
      socket.position.set(ex, 0.04, 0.24);
      this.head.add(socket);
    });

    const beanieDomeGeo = new THREE.SphereGeometry(0.32, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const beanieDome = new THREE.Mesh(beanieDomeGeo, beanieMat);
    beanieDome.position.y = 0.08;
    this.head.add(beanieDome);

    const beanieBrimGeo = new THREE.TorusGeometry(0.31, 0.06, 12, 24);
    beanieBrimGeo.rotateX(Math.PI / 2);
    const beanieBrim = new THREE.Mesh(beanieBrimGeo, beanieMat);
    beanieBrim.position.y = 0.08;
    this.head.add(beanieBrim);

    const patchGeo = new THREE.BoxGeometry(0.13, 0.13, 0.04);
    const patch = new THREE.Mesh(patchGeo, eyepatchMat);
    patch.position.set(-0.11, 0.05, 0.26);
    patch.rotation.z = 0.15;
    this.head.add(patch);

    const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.04, 0.04].forEach(rot => {
      const lineGeo = new THREE.BoxGeometry(0.11, 0.025, 0.05);
      const line = new THREE.Mesh(lineGeo, crossMat);
      line.rotation.z = rot > 0 ? Math.PI / 4 : -Math.PI / 4;
      patch.add(line);
    });

    // 🚀 3D BACK-ATTACHED ROCKET JETPACK MESH
    this.jetpackMesh = new THREE.Group();
    const rocketMat = new THREE.MeshStandardMaterial({ color: 0x00f3ff, metalness: 0.8, roughness: 0.2 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    [-0.22, 0.22].forEach(rx => {
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

    this.jetpackMesh.position.set(0, 0.2, -0.28);
    this.jetpackMesh.visible = false;
    this.bodyGroup.add(this.jetpackMesh);

    // 3. LIMBS
    const armGeo = new THREE.CapsuleGeometry(0.08, 0.65, 12, 12);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.45, 0.42, 0);
    const lArmMesh = new THREE.Mesh(armGeo, jacketMat);
    lArmMesh.position.y = -0.32;
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh);
    this.bodyGroup.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.45, 0.42, 0);
    const rArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rArmMesh.position.y = -0.32;
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh);
    this.bodyGroup.add(this.rightArm);

    const legGeo = new THREE.CapsuleGeometry(0.09, 0.75, 12, 12);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, -0.42, 0);
    const lLegMesh = new THREE.Mesh(legGeo, jacketMat);
    lLegMesh.position.y = -0.4;
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh);
    this.bodyGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, -0.42, 0);
    const rLegMesh = new THREE.Mesh(legGeo, jacketMat);
    rLegMesh.position.y = -0.4;
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh);
    this.bodyGroup.add(this.rightLeg);

    [-0.2, 0.2].forEach((x, idx) => {
      const bootGeo = new THREE.SphereGeometry(0.13, 16, 16);
      bootGeo.scale(1, 0.7, 1.4);
      const boot = new THREE.Mesh(bootGeo, boneMat);
      boot.position.set(0, -0.75, 0.05);
      (idx === 0 ? this.leftLeg : this.rightLeg).add(boot);
    });

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
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x00f3ff });
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

    this.hoverboardMesh.position.y = -0.95;
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
    this.shieldMesh.position.y = 0.2;
    this.shieldMesh.visible = false;
    this.bodyGroup.add(this.shieldMesh);
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

    if (this.isJetpackActive) {
      this.bodyGroup.position.y = 1.1;
      this.bodyGroup.rotation.x = Math.PI / 2.2;
      this.leftArm.rotation.x = -Math.PI * 0.85;
      this.rightArm.rotation.x = -Math.PI * 0.85;
      this.leftLeg.rotation.x = 0.15;
      this.rightLeg.rotation.x = 0.15;
    } else if (this.isRidingBull) {
      this.bodyGroup.position.y = 1.6;
      this.bodyGroup.rotation.x = 0.2;
      this.leftLeg.rotation.x = -Math.PI / 3;
      this.rightLeg.rotation.x = -Math.PI / 3;
      this.leftArm.rotation.x = -Math.PI / 4;
      this.rightArm.rotation.x = -Math.PI / 4;

      const bullAngle = Math.sin(this.animTime * 1.5) * 0.6;
      if (this.bullFrontLeft) {
        this.bullFrontLeft.rotation.x = bullAngle;
        this.bullBackRight.rotation.x = bullAngle;
        this.bullFrontRight.rotation.x = -bullAngle;
        this.bullBackLeft.rotation.x = -bullAngle;
      }
    } else if (this.isSliding) {
      this.bodyGroup.position.y = 0.5;
      this.bodyGroup.rotation.x = -Math.PI / 4;
      this.leftLeg.rotation.x = -Math.PI / 3;
      this.rightLeg.rotation.x = -Math.PI / 3;
    } else if (!this.isGrounded) {
      this.bodyGroup.position.y = 1.1;
      this.bodyGroup.rotation.x = 0;
      this.leftLeg.rotation.x = -Math.PI / 4;
      this.rightLeg.rotation.x = Math.PI / 6;
    } else {
      this.bodyGroup.position.y = 1.1;
      this.bodyGroup.rotation.x = 0.08;
      const armAngle = Math.sin(this.animTime) * 0.8;
      const legAngle = Math.sin(this.animTime) * 1.0;

      this.leftArm.rotation.x = armAngle;
      this.rightArm.rotation.x = -armAngle;
      this.leftLeg.rotation.x = -legAngle;
      this.rightLeg.rotation.x = legAngle;
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
