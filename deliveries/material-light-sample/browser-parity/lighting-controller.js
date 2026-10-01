/**
 * YOR WORLD - Workstation Sample Interactive Lighting Controller & State Manager
 * Implements WorldLighting contract with snapshot capture, focus isolation,
 * interactive variable mutations, and strict idempotent state restoration.
 */

export class LightingController {
  constructor(lights, materials) {
    this.lights = lights; // { hexLight, lightbarSpot, cyanUnderdesk, cyanHalo, pcRgb, pegSpot, keyFill, ambient }
    this.materials = materials; // { Mat_LightbarEmissive, Mat_HexLighting, Mat_PCInternalRGB }
    
    // Internal base snapshot
    this.baseSnapshot = this.captureSnapshot();
    
    // Active focus state
    this.currentFocusProject = null;
    this.preFocusSnapshot = null;
    
    // User preferences that must survive focus layers (lamp/blinds rule)
    this.userPreferences = {
      lampEnabled: this.baseSnapshot.lightbar.enabled,
      blindsClosed: false
    };
  }

  /**
   * Captures deep clone snapshot of all interactive lighting variables
   */
  captureSnapshot() {
    return {
      timestamp: Date.now(),
      ambient: {
        intensity: this.lights.ambient ? this.lights.ambient.intensity : 0.65,
        color: this.lights.ambient ? '#' + this.lights.ambient.color.getHexString() : '#e8eef8'
      },
      hexLight: {
        intensity: this.lights.hexLight ? this.lights.hexLight.intensity : 3.2,
        enabled: this.lights.hexLight ? this.lights.hexLight.visible : true,
        color: this.lights.hexLight ? '#' + this.lights.hexLight.color.getHexString() : '#f1a5f3'
      },
      lightbar: {
        intensity: this.lights.lightbarSpot ? this.lights.lightbarSpot.intensity : 4.5,
        enabled: this.lights.lightbarSpot ? this.lights.lightbarSpot.visible : true,
        color: this.lights.lightbarSpot ? '#' + this.lights.lightbarSpot.color.getHexString() : '#ffe28a'
      },
      cyanFill: {
        underdeskIntensity: this.lights.cyanUnderdesk ? this.lights.cyanUnderdesk.intensity : 3.0,
        underdeskEnabled: this.lights.cyanUnderdesk ? this.lights.cyanUnderdesk.visible : true,
        haloIntensity: this.lights.cyanHalo ? this.lights.cyanHalo.intensity : 2.5,
        haloEnabled: this.lights.cyanHalo ? this.lights.cyanHalo.visible : true
      },
      pcRgb: {
        intensity: this.lights.pcRgb ? this.lights.pcRgb.intensity : 2.0,
        enabled: this.lights.pcRgb ? this.lights.pcRgb.visible : true
      },
      pegSpot: {
        intensity: this.lights.pegSpot ? this.lights.pegSpot.intensity : 2.2,
        enabled: this.lights.pegSpot ? this.lights.pegSpot.visible : true
      },
      keyFill: {
        intensity: this.lights.keyFill ? this.lights.keyFill.intensity : 1.4,
        enabled: this.lights.keyFill ? this.lights.keyFill.visible : true
      }
    };
  }

  /**
   * Sets new base snapshot and updates user preferences
   */
  setBase(snapshot) {
    this.baseSnapshot = JSON.parse(JSON.stringify(snapshot));
    if (snapshot.lightbar && typeof snapshot.lightbar.enabled === 'boolean') {
      this.userPreferences.lampEnabled = snapshot.lightbar.enabled;
    }
  }

  /**
   * Returns copy of the authoritative base snapshot
   */
  getBase() {
    return JSON.parse(JSON.stringify(this.baseSnapshot));
  }

  /**
   * Applies focus layer for a project, isolating background lighting while preserving user preferences
   */
  setFocus(projectId) {
    if (projectId) {
      if (!this.preFocusSnapshot) {
        this.preFocusSnapshot = this.captureSnapshot();
      }
      this.currentFocusProject = projectId;
      
      // Focus preset: Dim ambient & decorative accents, emphasize monitor & task area
      if (this.lights.ambient) this.lights.ambient.intensity = 0.25;
      if (this.lights.hexLight) this.lights.hexLight.intensity = 0.8;
      if (this.lights.cyanUnderdesk) this.lights.cyanUnderdesk.intensity = 0.8;
      if (this.lights.cyanHalo) this.lights.cyanHalo.intensity = 3.2; // Backlight pops
      
      // CRITICAL CONTRACT: The focus layer CANNOT overwrite user's lamp preference
      if (this.lights.lightbarSpot) {
        this.lights.lightbarSpot.visible = this.userPreferences.lampEnabled;
        this.lights.lightbarSpot.intensity = this.userPreferences.lampEnabled ? 5.2 : 0.0;
      }
      if (this.materials.Mat_LightbarEmissive) {
        this.materials.Mat_LightbarEmissive.emissiveIntensity = this.userPreferences.lampEnabled ? 5.2 : 0.0;
      }
    } else {
      // Clear focus: restore state prior to focus application
      this.currentFocusProject = null;
      if (this.preFocusSnapshot) {
        this.restoreSnapshot(this.preFocusSnapshot);
        this.preFocusSnapshot = null;
      } else {
        this.restoreSnapshot(this.baseSnapshot);
      }
    }
  }

  /**
   * Sets an interactive lighting variable directly (e.g. user toggles a light or adjusts slider)
   */
  setInteractiveVariable(name, value) {
    switch (name) {
      case 'lightbar.enabled':
        this.userPreferences.lampEnabled = !!value;
        if (this.lights.lightbarSpot) this.lights.lightbarSpot.visible = !!value;
        if (this.materials.Mat_LightbarEmissive) {
          this.materials.Mat_LightbarEmissive.emissiveIntensity = value ? (this.baseSnapshot.lightbar.intensity || 4.5) : 0.0;
        }
        break;
      case 'lightbar.intensity':
        if (this.lights.lightbarSpot) {
          this.lights.lightbarSpot.intensity = Number(value);
          this.lights.lightbarSpot.visible = Number(value) > 0;
        }
        if (this.materials.Mat_LightbarEmissive) {
          this.materials.Mat_LightbarEmissive.emissiveIntensity = Number(value);
        }
        this.userPreferences.lampEnabled = Number(value) > 0;
        break;
      case 'hexLight.enabled':
        if (this.lights.hexLight) this.lights.hexLight.visible = !!value;
        if (this.materials.Mat_HexLighting) {
          this.materials.Mat_HexLighting.emissiveIntensity = value ? 6.0 : 0.0;
        }
        break;
      case 'hexLight.intensity':
        if (this.lights.hexLight) {
          this.lights.hexLight.intensity = Number(value);
          this.lights.hexLight.visible = Number(value) > 0;
        }
        if (this.materials.Mat_HexLighting) {
          this.materials.Mat_HexLighting.emissiveIntensity = Number(value) * 1.875;
        }
        break;
      case 'cyanFill.enabled':
        if (this.lights.cyanUnderdesk) this.lights.cyanUnderdesk.visible = !!value;
        if (this.lights.cyanHalo) this.lights.cyanHalo.visible = !!value;
        break;
      case 'cyanFill.intensity':
        if (this.lights.cyanUnderdesk) {
          this.lights.cyanUnderdesk.intensity = Number(value);
          this.lights.cyanUnderdesk.visible = Number(value) > 0;
        }
        if (this.lights.cyanHalo) {
          this.lights.cyanHalo.intensity = Number(value) * 0.833;
          this.lights.cyanHalo.visible = Number(value) > 0;
        }
        break;
      case 'ambient.intensity':
        if (this.lights.ambient) this.lights.ambient.intensity = Number(value);
        break;
      default:
        console.warn(`Unknown interactive lighting variable: ${name}`);
    }
  }

  /**
   * Restores lighting to the exact base snapshot state
   */
  restoreState() {
    this.currentFocusProject = null;
    this.preFocusSnapshot = null;
    this.restoreSnapshot(this.baseSnapshot);
  }

  /**
   * Applies an exact snapshot payload to all lights and materials
   */
  restoreSnapshot(snapshot) {
    if (!snapshot) return;

    if (snapshot.ambient && this.lights.ambient) {
      this.lights.ambient.intensity = snapshot.ambient.intensity;
      if (snapshot.ambient.color) this.lights.ambient.color.set(snapshot.ambient.color);
    }

    if (snapshot.hexLight && this.lights.hexLight) {
      this.lights.hexLight.intensity = snapshot.hexLight.intensity;
      this.lights.hexLight.visible = snapshot.hexLight.enabled;
      if (snapshot.hexLight.color) this.lights.hexLight.color.set(snapshot.hexLight.color);
      if (this.materials.Mat_HexLighting) {
        this.materials.Mat_HexLighting.emissiveIntensity = snapshot.hexLight.enabled ? snapshot.hexLight.intensity * 1.875 : 0.0;
      }
    }

    if (snapshot.lightbar && this.lights.lightbarSpot) {
      this.lights.lightbarSpot.intensity = snapshot.lightbar.intensity;
      this.lights.lightbarSpot.visible = snapshot.lightbar.enabled;
      if (snapshot.lightbar.color) this.lights.lightbarSpot.color.set(snapshot.lightbar.color);
      this.userPreferences.lampEnabled = snapshot.lightbar.enabled;
      if (this.materials.Mat_LightbarEmissive) {
        this.materials.Mat_LightbarEmissive.emissiveIntensity = snapshot.lightbar.enabled ? snapshot.lightbar.intensity : 0.0;
      }
    }

    if (snapshot.cyanFill) {
      if (this.lights.cyanUnderdesk) {
        this.lights.cyanUnderdesk.intensity = snapshot.cyanFill.underdeskIntensity;
        this.lights.cyanUnderdesk.visible = snapshot.cyanFill.underdeskEnabled;
      }
      if (this.lights.cyanHalo) {
        this.lights.cyanHalo.intensity = snapshot.cyanFill.haloIntensity;
        this.lights.cyanHalo.visible = snapshot.cyanFill.haloEnabled;
      }
    }

    if (snapshot.pcRgb && this.lights.pcRgb) {
      this.lights.pcRgb.intensity = snapshot.pcRgb.intensity;
      this.lights.pcRgb.visible = snapshot.pcRgb.enabled;
    }

    if (snapshot.pegSpot && this.lights.pegSpot) {
      this.lights.pegSpot.intensity = snapshot.pegSpot.intensity;
      this.lights.pegSpot.visible = snapshot.pegSpot.enabled;
    }

    if (snapshot.keyFill && this.lights.keyFill) {
      this.lights.keyFill.intensity = snapshot.keyFill.intensity;
      this.lights.keyFill.visible = snapshot.keyFill.enabled;
    }
  }

  /**
   * Compares current state against a target snapshot, returning detailed numerical delta
   */
  calculateDelta(targetSnapshot) {
    const current = this.captureSnapshot();
    const diffs = {};
    let maxDelta = 0;

    const check = (path, v1, v2) => {
      if (typeof v1 === 'number' && typeof v2 === 'number') {
        const d = Math.abs(v1 - v2);
        if (d > maxDelta) maxDelta = d;
        if (d > 1e-6) diffs[path] = { current: v1, target: v2, delta: d };
      } else if (v1 !== v2) {
        diffs[path] = { current: v1, target: v2, delta: 'boolean/string mismatch' };
        maxDelta = Math.max(maxDelta, 1.0);
      }
    };

    check('ambient.intensity', current.ambient.intensity, targetSnapshot.ambient.intensity);
    check('hexLight.intensity', current.hexLight.intensity, targetSnapshot.hexLight.intensity);
    check('hexLight.enabled', current.hexLight.enabled, targetSnapshot.hexLight.enabled);
    check('lightbar.intensity', current.lightbar.intensity, targetSnapshot.lightbar.intensity);
    check('lightbar.enabled', current.lightbar.enabled, targetSnapshot.lightbar.enabled);
    check('cyanFill.underdeskIntensity', current.cyanFill.underdeskIntensity, targetSnapshot.cyanFill.underdeskIntensity);
    check('cyanFill.underdeskEnabled', current.cyanFill.underdeskEnabled, targetSnapshot.cyanFill.underdeskEnabled);
    check('cyanFill.haloIntensity', current.cyanFill.haloIntensity, targetSnapshot.cyanFill.haloIntensity);
    check('cyanFill.haloEnabled', current.cyanFill.haloEnabled, targetSnapshot.cyanFill.haloEnabled);

    return {
      isRestored: Object.keys(diffs).length === 0,
      maxDelta,
      diffCount: Object.keys(diffs).length,
      diffs
    };
  }
}
