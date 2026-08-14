import * as THREE from 'three';

export const CHARACTERS = {
  SKELETON: {
    id: 'skeleton',
    name: 'CZAR',
    icon: '💀',
    defaultColor: '#7ca84d',
    secondaryColor: '#3a3d45',
    desc: 'Cybernetic skull runner with beanie, red X eyepatch, silver chain & wire spine.',
    texturePath: '/czar_character.jpg'
  },
  ILKERY: {
    id: 'ilkery',
    name: 'ILKERY',
    icon: '🐯',
    defaultColor: '#e868a2',
    secondaryColor: '#d63031',
    desc: 'Wild 3-eyed mutant tiger runner with BE KIND REWIND shirt & floating cap.',
    texturePath: '/ilkery_render.jpg'
  },
  MODEX: {
    id: 'modex',
    name: 'MODEX',
    icon: '⚡',
    defaultColor: '#70d6ff',
    secondaryColor: '#9b5de5',
    desc: 'Anime cyber runner with cyan hair, yellow visor & glowing purple neck veins.',
    texturePath: '/modex_render.jpg'
  }
};

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    this.currentCharacter = CHARACTERS.SKELETON;
    this.accentColor = CHARACTERS.SKELETON.defaultColor;

    this.textures = {};
    this.customCharTexture = null;
    this.customCoinTexture = null;

    const loader = new THREE.TextureLoader();
    loader.load('/czar_character.jpg', (t) => { t.colorSpace = THREE.SRGBColorSpace; this.textures.skeleton = t; if (this.currentCharacter.id === 'skeleton') this.buildCharacterMesh(); });
    loader.load('/ilkery_render.jpg', (t) => { t.colorSpace = THREE.SRGBColorSpace; this.textures.ilkery = t; if (this.currentCharacter.id === 'ilkery') this.buildCharacterMesh(); });
    loader.load('/modex_render.jpg', (t) => { t.colorSpace = THREE.SRGBColorSpace; this.textures.modex = t; if (this.currentCharacter.id === 'modex') this.buildCharacterMesh(); });

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

  // 🏃 JOINTED 3D MODULAR RUNNER BODY SYSTEM
  buildCharacterMesh() {
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    const charId = this.currentCharacter.id;

    // Master Body Group
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 1.1;
    this.mesh.add(this.bodyGroup);

    // 6 Jointed Sub-Nodes for Real 3D Stride Locomotion
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.82, 0);
    this.bodyGroup.add(this.headGroup);

    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, 0.1, 0);
    this.bodyGroup.add(this.torsoGroup);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.42, 0.42, 0);
    this.bodyGroup.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.42, 0.42, 0);
    this.bodyGroup.add(this.rightArm);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, -0.42, 0);
    this.bodyGroup.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, -0.42, 0);
    this.bodyGroup.add(this.rightLeg);

    if (charId === 'ilkery') {
      this.buildIlkerYJoints();
    } else if (charId === 'modex') {
      this.buildModeXJoints();
    } else {
      this.buildCzarJoints();
    }

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

    this.jetpackMesh.position.set(0, 0.2, 0.28);
    this.jetpackMesh.visible = false;
    this.bodyGroup.add(this.jetpackMesh);

    // 🐂 RAGING BULL MESH (Facing -Z Forward down track!)
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

  // 💀 CZAR: 3D CYBER SKELETON RUNNER JOINTS
  buildCzarJoints() {
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xe0e0d0, roughness: 0.4, metalness: 0.2 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x42464e, roughness: 0.4, metalness: 0.3 });
    if (this.customCharTexture || this.textures.skeleton) {
      jacketMat.map = this.customCharTexture || this.textures.skeleton;
      jacketMat.needsUpdate = true;
    }

    const beanieMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
    const eyepatchMat = new THREE.MeshStandardMaterial({ color: 0xcc1100, roughness: 0.3 });
    const chainMat = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.95, roughness: 0.1 });
    const wireColors = [0xff0000, 0x00f3ff, 0x00ff66, 0xffff00];

    // Torso & Spine
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 16), boneMat);
    spine.castShadow = true;
    this.torsoGroup.add(spine);

    wireColors.forEach((color, idx) => {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.88, 8), new THREE.MeshBasicMaterial({ color }));
      const angle = (idx / wireColors.length) * Math.PI * 2;
      wire.position.set(Math.cos(angle) * 0.05, 0, Math.sin(angle) * 0.05);
      this.torsoGroup.add(wire);
    });

    [-0.28, 0.28].forEach((jx, idx) => {
      const flap = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.75, 12, 12), jacketMat);
      flap.position.set(jx, 0, 0);
      flap.rotation.y = idx === 0 ? 0.25 : -0.25;
      this.torsoGroup.add(flap);
    });

    const chainGeo = new THREE.TorusGeometry(0.24, 0.035, 12, 24);
    chainGeo.rotateX(Math.PI / 3);
    const chain = new THREE.Mesh(chainGeo, chainMat);
    chain.position.set(0, 0.35, -0.06);
    this.torsoGroup.add(chain);

    // Head
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 24), boneMat);
    skull.castShadow = true;
    this.headGroup.add(skull);

    [-0.11, 0.11].forEach(ex => {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      socket.position.set(ex, 0.04, -0.24);
      this.headGroup.add(socket);
    });

    const beanieDome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6), beanieMat);
    beanieDome.position.y = 0.08;
    this.headGroup.add(beanieDome);

    const beanieBrimGeo = new THREE.TorusGeometry(0.31, 0.06, 12, 24);
    beanieBrimGeo.rotateX(Math.PI / 2);
    const beanieBrim = new THREE.Mesh(beanieBrimGeo, beanieMat);
    beanieBrim.position.y = 0.08;
    this.headGroup.add(beanieBrim);

    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.04), eyepatchMat);
    patch.position.set(0.11, 0.05, -0.26);
    patch.rotation.z = -0.15;
    this.headGroup.add(patch);

    // Left & Right Arms
    const armGeo = new THREE.CapsuleGeometry(0.08, 0.65, 12, 12);
    const lArmMesh = new THREE.Mesh(armGeo, jacketMat);
    lArmMesh.position.y = -0.32;
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh);

    const rArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rArmMesh.position.y = -0.32;
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh);

    // Left & Right Legs
    const legGeo = new THREE.CapsuleGeometry(0.09, 0.75, 12, 12);
    const lLegMesh = new THREE.Mesh(legGeo, jacketMat);
    lLegMesh.position.y = -0.4;
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh);

    const rLegMesh = new THREE.Mesh(legGeo, jacketMat);
    rLegMesh.position.y = -0.4;
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh);

    [-0.2, 0.2].forEach((x, idx) => {
      const bootGeo = new THREE.SphereGeometry(0.13, 16, 16);
      bootGeo.scale(1, 0.7, 1.4);
      const boot = new THREE.Mesh(bootGeo, boneMat);
      boot.position.set(0, -0.75, -0.05);
      (idx === 0 ? this.leftLeg : this.rightLeg).add(boot);
    });
  }

  // 🐯 ILKERY: 3D WILD MUTANT TIGER RUNNER JOINTS (Facing Forward down Track!)
  buildIlkerYJoints() {
    const tigerMat = new THREE.MeshStandardMaterial({ color: 0xe868a2, roughness: 0.5 });
    const redSkinMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.4 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x4a4e5a, roughness: 0.6 });
    if (this.textures.ilkery) {
      shirtMat.map = this.textures.ilkery;
      shirtMat.needsUpdate = true;
    }

    const capMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff3399, roughness: 0.3 });

    // Torso (Grey BE KIND REWIND Tee facing forward)
    const torsoGeo = new THREE.CapsuleGeometry(0.32, 0.75, 16, 16);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.castShadow = true;
    this.torsoGroup.add(torso);

    // Tiger Head
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), tigerMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    [-0.24, 0.24].forEach(ex => {
      const earGeo = new THREE.ConeGeometry(0.12, 0.22, 12);
      earGeo.rotateZ(ex > 0 ? -0.3 : 0.3);
      const ear = new THREE.Mesh(earGeo, tigerMat);
      ear.position.set(ex, 0.3, 0);
      this.headGroup.add(ear);
    });

    // Snout and Eyes facing -Z (Forward down track)
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), tigerMat);
    snout.position.set(0, -0.05, -0.22);
    this.headGroup.add(snout);

    const tongueGeo = new THREE.BoxGeometry(0.14, 0.04, 0.25);
    const tongue = new THREE.Mesh(tongueGeo, tongueMat);
    tongue.position.set(0, -0.12, -0.28);
    tongue.rotation.x = -0.25;
    this.headGroup.add(tongue);

    [-0.1, 0, 0.1].forEach((ex, idx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), eyeMat);
      eye.position.set(-ex, 0.08 + (idx === 1 ? 0.08 : 0), -0.26);
      this.headGroup.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), pupilMat);
      pupil.position.set(-ex, 0.08 + (idx === 1 ? 0.08 : 0), -0.31);
      this.headGroup.add(pupil);
    });

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 16), capMat);
    cap.position.set(0, 0.52, 0);
    cap.rotation.z = 0.3;
    this.headGroup.add(cap);

    const orbMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), orbMat);
    orb.position.set(-0.38, 0.45, -0.1);
    this.headGroup.add(orb);

    // Red Arms & Legs
    const armGeo = new THREE.CapsuleGeometry(0.09, 0.65, 12, 12);
    const lArmMesh = new THREE.Mesh(armGeo, redSkinMat);
    lArmMesh.position.y = -0.32;
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh);

    const rArmMesh = new THREE.Mesh(armGeo, redSkinMat);
    rArmMesh.position.y = -0.32;
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh);

    const legGeo = new THREE.CapsuleGeometry(0.1, 0.75, 12, 12);
    const lLegMesh = new THREE.Mesh(legGeo, redSkinMat);
    lLegMesh.position.y = -0.4;
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh);

    const rLegMesh = new THREE.Mesh(legGeo, redSkinMat);
    rLegMesh.position.y = -0.4;
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh);

    const bootMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 });
    [-0.2, 0.2].forEach((x, idx) => {
      const bootGeo = new THREE.SphereGeometry(0.14, 16, 16);
      bootGeo.scale(1, 0.7, 1.4);
      const boot = new THREE.Mesh(bootGeo, bootMat);
      boot.position.set(0, -0.75, -0.05);
      (idx === 0 ? this.leftLeg : this.rightLeg).add(boot);
    });
  }

  // ⚡ MODEX: 3D ANIME CYBER RUNNER JOINTS
  buildModeXJoints() {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.6 });
    const cyanHairMat = new THREE.MeshStandardMaterial({ color: 0x70d6ff, roughness: 0.3 });
    const beanieMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.85 });
    const veinMat = new THREE.MeshBasicMaterial({ color: 0x9b5de5 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.4 });
    if (this.textures.modex) {
      shirtMat.map = this.textures.modex;
      shirtMat.needsUpdate = true;
    }
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x2b2d42, roughness: 0.5 });
    const sneakerMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.3 });

    // Torso (White T-shirt with Robinhood Disco Feather emblem)
    const torsoGeo = new THREE.CapsuleGeometry(0.3, 0.75, 16, 16);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.castShadow = true;
    this.torsoGroup.add(torso);

    // Head
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 24), skinMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    [-0.08, 0.08].forEach(vx => {
      const vein = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8), veinMat);
      vein.position.set(vx, -0.3, -0.1);
      this.headGroup.add(vein);
    });

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), cyanHairMat);
    hair.position.set(0, 0.04, 0.02);
    this.headGroup.add(hair);

    const beanieGeo = new THREE.SphereGeometry(0.31, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const beanie = new THREE.Mesh(beanieGeo, beanieMat);
    beanie.position.y = 0.08;
    this.headGroup.add(beanie);

    const visorGeo = new THREE.BoxGeometry(0.42, 0.12, 0.08);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.04, -0.22);
    this.headGroup.add(visor);

    // Arms
    const armGeo = new THREE.CapsuleGeometry(0.085, 0.65, 12, 12);
    const lArmMesh = new THREE.Mesh(armGeo, skinMat);
    lArmMesh.position.y = -0.32;
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh);

    const rArmMesh = new THREE.Mesh(armGeo, skinMat);
    rArmMesh.position.y = -0.32;
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh);

    // Cargo Pants & High-top Sneakers
    const legGeo = new THREE.CapsuleGeometry(0.095, 0.75, 12, 12);
    const lLegMesh = new THREE.Mesh(legGeo, pantsMat);
    lLegMesh.position.y = -0.4;
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh);

    const rLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rLegMesh.position.y = -0.4;
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh);

    [-0.2, 0.2].forEach((x, idx) => {
      const bootGeo = new THREE.SphereGeometry(0.13, 16, 16);
      bootGeo.scale(1, 0.7, 1.4);
      const boot = new THREE.Mesh(bootGeo, sneakerMat);
      boot.position.set(0, -0.75, -0.05);
      (idx === 0 ? this.leftLeg : this.rightLeg).add(boot);
    });
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

  // 🏃 REAL 3D ARM & LEG STRIDE RUNNING ANIMATION
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
      // 🚀 FORWARD SUPERMAN FLIGHT (Head-first facing forward -Z down track!)
      this.bodyGroup.position.y = 1.1;
      this.bodyGroup.rotation.x = -Math.PI / 2.2;
      this.bodyGroup.rotation.y = 0;
      if (this.headGroup) this.headGroup.rotation.x = -0.3;
      if (this.leftArm) this.leftArm.rotation.x = Math.PI * 0.85;
      if (this.rightArm) this.rightArm.rotation.x = Math.PI * 0.85;
      if (this.leftLeg) this.leftLeg.rotation.x = -0.15;
      if (this.rightLeg) this.rightLeg.rotation.x = -0.15;
    } else if (this.hasHoverboard) {
      // 🛹 SKATEBOARD GLIDING STANCE (Wide knees, no leg running!)
      this.bodyGroup.position.y = 0.95;
      this.bodyGroup.rotation.x = -0.05;
      this.bodyGroup.rotation.y = -0.35;
      if (this.headGroup) {
        this.headGroup.rotation.y = 0.35;
        this.headGroup.rotation.x = 0;
      }
      if (this.leftLeg) this.leftLeg.rotation.x = -0.25;
      if (this.rightLeg) this.rightLeg.rotation.x = 0.25;
      if (this.leftArm) this.leftArm.rotation.x = 0.3;
      if (this.rightArm) this.rightArm.rotation.x = -0.3;
    } else if (this.isRidingBull) {
      this.bodyGroup.position.y = 1.6;
      this.bodyGroup.rotation.x = -0.2;
      this.bodyGroup.rotation.y = 0;
      if (this.headGroup) {
        this.headGroup.rotation.y = 0;
        this.headGroup.rotation.x = 0;
      }
      if (this.leftLeg) this.leftLeg.rotation.x = Math.PI / 3;
      if (this.rightLeg) this.rightLeg.rotation.x = Math.PI / 3;
      if (this.leftArm) this.leftArm.rotation.x = Math.PI / 4;
      if (this.rightArm) this.rightArm.rotation.x = Math.PI / 4;

      const bullAngle = Math.sin(this.animTime * 1.5) * 0.6;
      if (this.bullFrontLeft) {
        this.bullFrontLeft.rotation.x = bullAngle;
        this.bullBackRight.rotation.x = bullAngle;
        this.bullFrontRight.rotation.x = -bullAngle;
        this.bullBackLeft.rotation.x = -bullAngle;
      }
    } else if (this.isSliding) {
      this.bodyGroup.position.y = 0.5;
      this.bodyGroup.rotation.x = Math.PI / 4;
      this.bodyGroup.rotation.y = 0;
      if (this.headGroup) {
        this.headGroup.rotation.y = 0;
        this.headGroup.rotation.x = 0;
      }
      if (this.leftLeg) this.leftLeg.rotation.x = Math.PI / 3;
      if (this.rightLeg) this.rightLeg.rotation.x = Math.PI / 3;
    } else if (!this.isGrounded) {
      this.bodyGroup.position.y = 1.1;
      this.bodyGroup.rotation.x = 0;
      this.bodyGroup.rotation.y = 0;
      if (this.headGroup) {
        this.headGroup.rotation.y = 0;
        this.headGroup.rotation.x = 0;
      }
      if (this.leftLeg) this.leftLeg.rotation.x = Math.PI / 4;
      if (this.rightLeg) this.rightLeg.rotation.x = -Math.PI / 6;
    } else {
      // 🏃 REAL 3D ARM & LEG STRIDE RUNNING ANIMATION
      this.bodyGroup.position.y = 1.1 + Math.abs(Math.sin(this.animTime * 2.8)) * 0.18;
      this.bodyGroup.rotation.x = -0.08;
      this.bodyGroup.rotation.y = -Math.cos(this.animTime * 2.8) * 0.12;

      // Leg Striding & Knee Flexing
      const legStride = Math.sin(this.animTime * 2.8) * 0.88;
      if (this.leftLeg) this.leftLeg.rotation.x = -legStride;
      if (this.rightLeg) this.rightLeg.rotation.x = legStride;

      // Arms Swing Opposite to Legs!
      const armSwing = -Math.sin(this.animTime * 2.8) * 0.88;
      if (this.leftArm) this.leftArm.rotation.x = -armSwing;
      if (this.rightArm) this.rightArm.rotation.x = armSwing;

      if (this.headGroup) {
        this.headGroup.rotation.y = Math.cos(this.animTime * 2.8) * 0.08;
      }
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
