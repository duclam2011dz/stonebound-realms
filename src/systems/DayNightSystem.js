import * as THREE from "three";
import { blendSkyColor, clamp, computeSunDirection } from "./dayNight/dayNightMath.js";

export class DayNightSystem {
  constructor({ scene, camera, world, lighting, cycleDurationSeconds = 1170 }) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.lighting = lighting;
    this.cycleDurationSeconds = cycleDurationSeconds;
    this.timeSeconds = 0;
    this.nightVisionEnabled = false;

    this.skyDistance = 190;
    this.sunDirection = new THREE.Vector3();
    this.moonDirection = new THREE.Vector3();
    this.tempPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();

    this.skyDayColor = new THREE.Color(0x9cccf6);
    this.skyNightColor = new THREE.Color(0x0f1628);
    this.skyDawnDuskColor = new THREE.Color(0xe29a67);
    this.fogDayColor = new THREE.Color(0x95c2ea);
    this.fogNightColor = new THREE.Color(0x141f34);
    this.workingSkyColor = new THREE.Color();
    this.workingFogColor = new THREE.Color();
    this.workingNightVisionBlend = new THREE.Color(0x84a6d9);
    this.workingCaveDarkSky = new THREE.Color(0x06080f);
    this.workingCaveDarkFog = new THREE.Color(0x05070c);
  }

  setTimePreset(mode) {
    if (mode === "day") {
      this.timeSeconds = 0;
      return;
    }
    if (mode === "night") {
      this.timeSeconds = this.cycleDurationSeconds * 0.5;
    }
  }

  setNightVisionEnabled(enabled) {
    this.nightVisionEnabled = Boolean(enabled);
  }

  isNightVisionEnabled() {
    return this.nightVisionEnabled;
  }

  getTimeState() {
    const phase = this.timeSeconds / this.cycleDurationSeconds;
    return {
      phase,
      mode: phase < 0.5 ? "day" : "night"
    };
  }

  update(dt, playerPosition) {
    this.timeSeconds = (this.timeSeconds + dt) % this.cycleDurationSeconds;
    this.applyToScene(playerPosition);
  }

  applyToScene(playerPosition) {
    const phase = this.timeSeconds / this.cycleDurationSeconds;
    this.sunDirection.copy(computeSunDirection(phase));
    this.moonDirection.copy(this.sunDirection).multiplyScalar(-1);

    const dayFactor = clamp(this.sunDirection.y * 1.35 + 0.06, 0, 1);
    const nightFactor = clamp(this.moonDirection.y * 1.28 + 0.02, 0, 1);
    const twilight = clamp(1 - Math.abs(this.sunDirection.y) * 4.5, 0, 1);
    const sunlight = dayFactor > 0.001
      ? this.world.getSunOcclusionAt(playerPosition.x, playerPosition.y + 1.6, playerPosition.z, this.sunDirection)
      : {
        directVisibility: 1,
        ambientVisibility: 1,
        caveFactor: 0
      };
    const moonVisibility = nightFactor > 0.001
      ? this.world.getDirectionalVisibilityAt(playerPosition.x, playerPosition.y + 1.6, playerPosition.z, this.moonDirection, 34)
      : 1;

    const sunExposure = dayFactor * sunlight.directVisibility;
    const moonExposure = nightFactor * (0.08 + moonVisibility * 0.32);
    const skyOpenFraction = sunlight.skyOpenFraction ?? 1;
    const deepCaveFactor = clamp((0.06 - skyOpenFraction) / 0.06, 0, 1);

    const directSunScale = this.nightVisionEnabled ? 1 : sunlight.directVisibility;
    const directMoonScale = this.nightVisionEnabled ? 1 : Math.max(0.04, moonVisibility * 0.9);
    this.lighting.sunLight.intensity = dayFactor * 1.9 * directSunScale;
    this.lighting.moonLight.intensity = nightFactor * (this.nightVisionEnabled ? 0.18 : 0.3) * directMoonScale;
    const ambientBase = this.nightVisionEnabled
      ? (0.2 + dayFactor * 0.08)
      : (0.02 + dayFactor * 0.18 + nightFactor * 0.06 + moonExposure * 0.05 + sunExposure * 0.06);
    const hemiBase = this.nightVisionEnabled
      ? 0.48
      : (0.12 + dayFactor * 0.68 + nightFactor * 0.12 + moonExposure * 0.08 + sunExposure * 0.12);
    const caveScale = this.nightVisionEnabled ? 1 : (1 - deepCaveFactor * 0.95);
    this.lighting.ambientLight.intensity = ambientBase * caveScale;
    this.lighting.hemisphereLight.intensity = hemiBase * caveScale;

    this.updateCelestialBody(this.lighting.sunBody, this.sunDirection, playerPosition, this.sunDirection.y > -0.08);
    this.updateCelestialBody(this.lighting.moonBody, this.moonDirection, playerPosition, this.moonDirection.y > -0.08);
    this.updateDirectionalLight(this.lighting.sunLight, this.sunDirection, playerPosition);
    this.updateDirectionalLight(this.lighting.moonLight, this.moonDirection, playerPosition);

    blendSkyColor(
      this.workingSkyColor,
      this.skyNightColor,
      this.skyDayColor,
      this.skyDawnDuskColor,
      dayFactor,
      twilight
    );
    blendSkyColor(
      this.workingFogColor,
      this.fogNightColor,
      this.fogDayColor,
      this.skyDawnDuskColor,
      dayFactor,
      twilight * 0.8
    );

    if (!this.nightVisionEnabled) {
      const nightDarkness = clamp(1 - dayFactor * 1.35, 0, 1);
      const darknessBlend = clamp(deepCaveFactor * 0.95 + nightDarkness * 0.32, 0, 1);
      this.workingSkyColor.lerp(this.workingCaveDarkSky, darknessBlend);
      this.workingFogColor.lerp(this.workingCaveDarkFog, darknessBlend * 0.92);
    }

    if (this.nightVisionEnabled && dayFactor < 0.52) {
      const nightVisionBoost = clamp((0.45 - dayFactor) / 0.45, 0, 1);
      this.workingSkyColor.lerp(this.workingNightVisionBlend, nightVisionBoost * 0.45);
      this.workingFogColor.lerp(this.workingNightVisionBlend, nightVisionBoost * 0.35);
    }

    this.scene.background = this.workingSkyColor;
    if (this.scene.fog) {
      this.scene.fog.color.copy(this.workingFogColor);
    }
  }

  updateDirectionalLight(light, direction, playerPosition) {
    this.tempPosition.copy(direction).multiplyScalar(this.skyDistance).add(playerPosition);
    light.position.copy(this.tempPosition);
    light.target.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
    light.target.updateMatrixWorld();
  }

  updateCelestialBody(body, direction, playerPosition, isVisible) {
    body.visible = isVisible;
    if (!isVisible) return;
    this.tempPosition.copy(direction).multiplyScalar(this.skyDistance * 0.95).add(playerPosition);
    body.position.copy(this.tempPosition);
    this.targetPosition.copy(this.camera.position);
    body.lookAt(this.targetPosition);
  }
}
