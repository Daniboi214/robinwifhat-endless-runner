import * as THREE from 'three';

export class ChaserBear {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.scene.add(this.mesh);

    this.defaultZOffset = 2.8;
    this.offscreenZOffset = 16.0;
    this.currentZOffset = this.defaultZOffset;
    this.targetZOffset = this.defaultZOffset;

    // Authentic Subway Surfers Chaser Timer (7 seconds)
    this.chaseTimer = 7.0;
    this.animTime = 0;
    this.isRoaring = false;

    this.buildBearMesh();
  }

  buildBearMesh() {
    while (this.mesh.children.length > 0) {
      this.mesh.remove(this.mesh.children[0]);
    }

    const furMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e16,
      roughness: 0.8,
      metalness: 0.1
    });

    const snoutMat = new THREE.MeshStandardMaterial({
      color: 0x6e4827,
      roughness: 0.7
    });

    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.2
    });

    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xff1100
    });

    const clawMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.3
    });

    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 0.8;
    this.mesh.add(this.bodyGroup);

    const torsoGeo = new THREE.CapsuleGeometry(0.55, 1.1, 16, 20);
    torsoGeo.rotateX(Math.PI / 2);
    this.torso = new THREE.Mesh(torsoGeo, furMat);
    this.torso.castShadow = true;
    this.bodyGroup.add(this.torso);

    const humpGeo = new THREE.SphereGeometry(0.58, 16, 16);
    const hump = new THREE.Mesh(humpGeo, furMat);
    hump.position.set(0, 0.3, -0.2);
    this.torso.add(hump);

    const headGeo = new THREE.SphereGeometry(0.42, 20, 20);
    this.head = new THREE.Mesh(headGeo, furMat);
    this.head.position.set(0, 0.35, -0.85);
    this.head.castShadow = true;
    this.bodyGroup.add(this.head);

    const snoutGeo = new THREE.SphereGeometry(0.24, 16, 16);
    snoutGeo.scale(1, 0.75, 1.2);
    const snout = new THREE.Mesh(snoutGeo, snoutMat);
    snout.position.set(0, -0.08, -0.32);
    this.head.add(snout);

    const noseGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.08, -0.2);
    snout.add(nose);

    [-0.2, 0.2].forEach(ex => {
      const eyeGeo = new THREE.SphereGeometry(0.06, 12, 12);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(ex, 0.12, -0.32);
      this.head.add(eye);
    });

    [-0.28, 0.28].forEach(ex => {
      const earGeo = new THREE.SphereGeometry(0.14, 12, 12);
      const ear = new THREE.Mesh(earGeo, furMat);
      ear.position.set(ex, 0.32, -0.05);
      this.head.add(ear);
    });

    const legGeo = new THREE.CapsuleGeometry(0.16, 0.5, 12, 12);

    this.frontLeftLeg = new THREE.Mesh(legGeo, furMat);
    this.frontLeftLeg.position.set(-0.4, -0.45, -0.45);
    this.bodyGroup.add(this.frontLeftLeg);

    this.frontRightLeg = new THREE.Mesh(legGeo, furMat);
    this.frontRightLeg.position.set(0.4, -0.45, -0.45);
    this.bodyGroup.add(this.frontRightLeg);

    this.backLeftLeg = new THREE.Mesh(legGeo, furMat);
    this.backLeftLeg.position.set(-0.4, -0.45, 0.45);
    this.bodyGroup.add(this.backLeftLeg);

    this.backRightLeg = new THREE.Mesh(legGeo, furMat);
    this.backRightLeg.position.set(0.4, -0.45, 0.45);
    this.bodyGroup.add(this.backRightLeg);

    [this.frontLeftLeg, this.frontRightLeg, this.backLeftLeg, this.backRightLeg].forEach(leg => {
      for (let c = -0.08; c <= 0.08; c += 0.08) {
        const clawGeo = new THREE.ConeGeometry(0.03, 0.14, 8);
        clawGeo.rotateX(Math.PI / 2);
        const claw = new THREE.Mesh(clawGeo, clawMat);
        claw.position.set(c, -0.32, -0.12);
        leg.add(claw);
      }
    });

    this.mesh.scale.set(0.9, 0.9, 0.9);
  }

  startRun() {
    this.chaseTimer = 7.0;
    this.targetZOffset = this.defaultZOffset;
    this.currentZOffset = this.defaultZOffset;
    this.mesh.visible = true;
  }

  stumble() {
    this.chaseTimer = 7.0;
    this.targetZOffset = 1.1;
    this.mesh.visible = true;
    this.isRoaring = true;
    setTimeout(() => { this.isRoaring = false; }, 1500);
  }

  update(playerPos, runSpeed, delta) {
    if (this.chaseTimer > 0) {
      this.chaseTimer -= delta;
      if (this.targetZOffset < this.defaultZOffset) {
        this.targetZOffset += delta * 0.6;
      }
    } else {
      this.targetZOffset = this.offscreenZOffset;
    }

    this.currentZOffset += (this.targetZOffset - this.currentZOffset) * 4 * delta;

    this.mesh.position.x += (playerPos.x - this.mesh.position.x) * 12 * delta;
    const targetY = playerPos.y > 2.5 ? 0 : playerPos.y;
    this.mesh.position.y += (targetY - this.mesh.position.y) * 10 * delta;
    this.mesh.position.z = playerPos.z + this.currentZOffset;

    if (this.currentZOffset > 14.0) {
      this.mesh.visible = false;
    } else {
      this.mesh.visible = true;
    }

    if (!this.mesh.visible) return;

    this.animTime += delta * runSpeed * 1.2;
    const legAngle = Math.sin(this.animTime) * 0.6;

    this.frontLeftLeg.rotation.x = legAngle;
    this.backRightLeg.rotation.x = legAngle;
    this.frontRightLeg.rotation.x = -legAngle;
    this.backLeftLeg.rotation.x = -legAngle;

    const headBob = Math.sin(this.animTime * 2) * 0.06;
    this.head.position.y = 0.35 + headBob;
    this.head.rotation.x = this.isRoaring ? -0.25 : 0;
  }

  isDangerouslyClose() {
    return this.mesh.visible && this.currentZOffset < 1.4;
  }
}
