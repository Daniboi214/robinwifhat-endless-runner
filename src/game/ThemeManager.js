import * as THREE from 'three';

export const THEMES = {
  FOREST: {
    id: 'forest',
    name: 'LUSH FOREST',
    icon: '🌲',
    skyColor: 0x1b3824, // Deep atmospheric emerald canopy sky
    fogColor: 0x1b3824, // Seamless matching forest fog
    roadColor: 0x362517, // Rich woodland soil path
    gridLineColor: 0x4d7c38, // Mossy lane dividers
    buildingColor: 0x24180d,
    accentColor: 0x4d7c38,
    trainColor: 0x4a321a,
    trainHeadlight: 0xffaa00,
    coinColor: 0xffffff,
    desc: 'Sun-dappled ancient woodland with giant redwoods, birch trees, mossy boulders & glowing mushrooms.'
  },
  CYBERPUNK: {
    id: 'cyberpunk',
    name: 'CYBER CITY',
    icon: '🌃',
    skyColor: 0x0c0f24,
    fogColor: 0x0c0f24,
    roadColor: 0x11162b,
    gridLineColor: 0x00f3ff,
    buildingColor: 0x080a14,
    accentColor: 0x00f3ff,
    trainColor: 0x1a233a,
    trainHeadlight: 0xff0055,
    coinColor: 0xffffff,
    desc: 'Neon illuminated rainy highway with mag-lev cyber trains.'
  },
  COSMIC: {
    id: 'cosmic',
    name: 'COSMIC HIGHWAY',
    icon: '🌌',
    skyColor: 0x05041a,
    fogColor: 0x05041a,
    roadColor: 0x090720,
    gridLineColor: 0xb000ff,
    buildingColor: 0x0d0a2d,
    accentColor: 0xb000ff,
    trainColor: 0x221345,
    trainHeadlight: 0x00f3ff,
    coinColor: 0xffffff,
    desc: 'Interstellar translucent glass track surrounded by space nebulas.'
  }
};

export class ThemeManager {
  constructor(scene) {
    this.scene = scene;
    this.currentTheme = THEMES.FOREST;
    this.materials = {};

    this.coinTexture = null;
    const loader = new THREE.TextureLoader();

    loader.load('/custom_coin.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      this.coinTexture = tex;
      if (this.materials.coinFace) {
        this.materials.coinFace.map = tex;
        this.materials.coinFace.needsUpdate = true;
      }
    });

    this.initMaterials();
  }

  initMaterials() {
    // Ground Dirt Path
    this.materials.road = new THREE.MeshStandardMaterial({
      color: this.currentTheme.roadColor,
      roughness: 0.85,
      metalness: 0.05
    });

    // Mossy Lane Dividers
    this.materials.gridLine = new THREE.MeshBasicMaterial({
      color: this.currentTheme.gridLineColor
    });

    // Dark Bark Trunk Material
    this.materials.trunkDark = new THREE.MeshStandardMaterial({
      color: 0x3d2512,
      roughness: 0.9,
      metalness: 0.1
    });

    // White Birch Bark Trunk Material
    this.materials.trunkBirch = new THREE.MeshStandardMaterial({
      color: 0xddddcc,
      roughness: 0.6,
      metalness: 0.1
    });

    // Dense Pine Needle Canopy (Deep Forest Emerald)
    this.materials.pineCanopy = new THREE.MeshStandardMaterial({
      color: 0x1b4d27,
      roughness: 0.5,
      metalness: 0.1
    });

    // Bright Lime Birch Foliage
    this.materials.birchFoliage = new THREE.MeshStandardMaterial({
      color: 0x4caf50,
      roughness: 0.6
    });

    // Mossy Boulder Material
    this.materials.mossRock = new THREE.MeshStandardMaterial({
      color: 0x3e4a3d,
      roughness: 0.95
    });

    // Glowing Mushroom Cap
    this.materials.shroomCap = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });

    // Coin Materials
    this.materials.coinFace = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x333333,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide
    });

    if (this.coinTexture) {
      this.materials.coinFace.map = this.coinTexture;
    }

    this.materials.coinRim = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0x443300,
      emissiveIntensity: 0.4
    });

    // Obstacles
    this.materials.train = new THREE.MeshStandardMaterial({
      color: this.currentTheme.trainColor,
      roughness: 0.6
    });

    this.materials.trainHeadlight = new THREE.MeshBasicMaterial({
      color: this.currentTheme.trainHeadlight
    });

    this.materials.hurdleLow = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      roughness: 0.8
    });

    this.materials.hurdleHigh = new THREE.MeshStandardMaterial({
      color: 0x6e6e6e,
      roughness: 0.8
    });
  }

  setTheme(themeId) {
    const found = Object.values(THEMES).find(t => t.id === themeId);
    if (!found) return;

    this.currentTheme = found;

    this.scene.background = new THREE.Color(this.currentTheme.skyColor);
    this.scene.fog = new THREE.Fog(this.currentTheme.fogColor, 35, 150);

    this.materials.road.color.setHex(this.currentTheme.roadColor);
    this.materials.gridLine.color.setHex(this.currentTheme.gridLineColor);
    this.materials.train.color.setHex(this.currentTheme.trainColor);
    this.materials.trainHeadlight.color.setHex(this.currentTheme.trainHeadlight);
  }

  createRoadChunkGeometry() {
    const group = new THREE.Group();

    // 🛣️ SOLID CONTINUOUS DIRT ROAD TRACK (11.5 Units Wide)
    const roadGeo = new THREE.BoxGeometry(11.5, 0.4, 50);
    const road = new THREE.Mesh(roadGeo, this.materials.road);
    road.position.y = -0.2;
    road.receiveShadow = true;
    group.add(road);

    // Mossy Lane Dividers
    [-1.9, 1.9].forEach(x => {
      const lineGeo = new THREE.BoxGeometry(0.12, 0.05, 50);
      const line = new THREE.Mesh(lineGeo, this.materials.gridLine);
      line.position.set(x, 0.02, 0);
      group.add(line);
    });

    // Log Side Rails
    [-5.75, 5.75].forEach(x => {
      const railGeo = new THREE.CylinderGeometry(0.32, 0.32, 50, 16);
      railGeo.rotateX(Math.PI / 2);
      const rail = new THREE.Mesh(railGeo, this.materials.hurdleLow);
      rail.position.set(x, 0.2, 0);
      group.add(rail);
    });

    // 🌲 DENSE HIGH-DETAIL FOREST ENVIRONMENT (Both Sides)
    for (let side = -1; side <= 1; side += 2) {
      for (let z = -22; z <= 22; z += 12) {
        const sideX = side * (8.0 + Math.random() * 4.0);
        const zPos = z + (Math.random() * 4.0 - 2.0);
        const treeType = Math.random();

        const itemGroup = new THREE.Group();
        itemGroup.position.set(sideX, 0, zPos);

        if (treeType < 0.45) {
          // 🌲 1. TALL ANCIENT PINE / REDWOOD TREE
          const trunkGeo = new THREE.CylinderGeometry(0.4, 0.75, 10, 16);
          const trunk = new THREE.Mesh(trunkGeo, this.materials.trunkDark);
          trunk.position.y = 5;
          trunk.castShadow = true;
          itemGroup.add(trunk);

          [7, 9.5, 12, 14.5].forEach((y, idx) => {
            const radius = 3.5 - idx * 0.75;
            const canopyGeo = new THREE.ConeGeometry(radius, 4.5, 12);
            const canopy = new THREE.Mesh(canopyGeo, this.materials.pineCanopy);
            canopy.position.y = y;
            canopy.castShadow = true;
            itemGroup.add(canopy);
          });
        } else if (treeType < 0.75) {
          // 🌳 2. LUSH BIRCH TREE
          const trunkGeo = new THREE.CylinderGeometry(0.25, 0.45, 9, 12);
          const trunk = new THREE.Mesh(trunkGeo, this.materials.trunkBirch);
          trunk.position.y = 4.5;
          trunk.castShadow = true;
          itemGroup.add(trunk);

          [6.5, 8.8, 11].forEach((y, idx) => {
            const radius = 2.8 - idx * 0.6;
            const foliageGeo = new THREE.IcosahedronGeometry(radius, 2);
            const foliage = new THREE.Mesh(foliageGeo, this.materials.birchFoliage);
            foliage.position.y = y;
            foliage.castShadow = true;
            itemGroup.add(foliage);
          });
        } else {
          // 🪨 3. MOSSY BOULDER & GLOWING MUSHROOM CLUSTER
          const rockGeo = new THREE.DodecahedronGeometry(1.4 + Math.random() * 0.8, 1);
          const rock = new THREE.Mesh(rockGeo, this.materials.mossRock);
          rock.position.y = 0.8;
          rock.rotation.set(Math.random(), Math.random(), Math.random());
          rock.castShadow = true;
          itemGroup.add(rock);

          // Glowing Mushrooms on Rock
          for (let m = 0; m < 3; m++) {
            const shroomGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
            const shroom = new THREE.Mesh(shroomGeo, this.materials.shroomCap);
            shroom.position.set((Math.random() - 0.5) * 1.2, 1.4, (Math.random() - 0.5) * 1.2);
            itemGroup.add(shroom);
          }
        }

        group.add(itemGroup);
      }
    }

    return group;
  }
}
