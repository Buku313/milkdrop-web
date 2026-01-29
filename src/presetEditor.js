/**
 * Preset Editor - Allows real-time editing of MilkDrop preset parameters
 */
export class PresetEditor {
  constructor(visualizer, presetManager) {
    this.visualizer = visualizer;
    this.presetManager = presetManager;
    this.currentPreset = null;
    this.editedValues = {};
    this.isOpen = false;

    // Editable parameters with descriptions and ranges
    this.editableParams = {
      // Motion
      zoom: { min: 0.5, max: 2, step: 0.01, default: 1, category: 'Motion', desc: 'Zoom amount per frame' },
      zoomexp: { min: 0.5, max: 2, step: 0.01, default: 1, category: 'Motion', desc: 'Zoom exponent' },
      rot: { min: -1, max: 1, step: 0.01, default: 0, category: 'Motion', desc: 'Rotation per frame' },
      warp: { min: 0, max: 2, step: 0.01, default: 0, category: 'Motion', desc: 'Warp amount' },
      cx: { min: 0, max: 1, step: 0.01, default: 0.5, category: 'Motion', desc: 'Center X position' },
      cy: { min: 0, max: 1, step: 0.01, default: 0.5, category: 'Motion', desc: 'Center Y position' },
      dx: { min: -0.5, max: 0.5, step: 0.01, default: 0, category: 'Motion', desc: 'X translation' },
      dy: { min: -0.5, max: 0.5, step: 0.01, default: 0, category: 'Motion', desc: 'Y translation' },
      sx: { min: 0.5, max: 2, step: 0.01, default: 1, category: 'Motion', desc: 'X stretch' },
      sy: { min: 0.5, max: 2, step: 0.01, default: 1, category: 'Motion', desc: 'Y stretch' },

      // Visual
      decay: { min: 0.8, max: 1, step: 0.001, default: 0.98, category: 'Visual', desc: 'Frame decay/persistence' },
      gamma: { min: 1, max: 4, step: 0.1, default: 2, category: 'Visual', desc: 'Gamma correction' },
      echo_zoom: { min: 0.5, max: 2, step: 0.01, default: 1, category: 'Visual', desc: 'Echo layer zoom' },
      echo_alpha: { min: 0, max: 1, step: 0.01, default: 0, category: 'Visual', desc: 'Echo layer opacity' },
      echo_orient: { min: 0, max: 3, step: 1, default: 0, category: 'Visual', desc: 'Echo orientation' },
      invert: { min: 0, max: 1, step: 1, default: 0, category: 'Visual', desc: 'Invert colors' },
      brighten: { min: 0, max: 1, step: 1, default: 0, category: 'Visual', desc: 'Brighten colors' },
      darken: { min: 0, max: 1, step: 1, default: 0, category: 'Visual', desc: 'Darken colors' },
      solarize: { min: 0, max: 1, step: 1, default: 0, category: 'Visual', desc: 'Solarize effect' },

      // Wave
      wave_mode: { min: 0, max: 7, step: 1, default: 0, category: 'Wave', desc: 'Waveform type' },
      wave_x: { min: 0, max: 1, step: 0.01, default: 0.5, category: 'Wave', desc: 'Wave X position' },
      wave_y: { min: 0, max: 1, step: 0.01, default: 0.5, category: 'Wave', desc: 'Wave Y position' },
      wave_r: { min: 0, max: 1, step: 0.01, default: 1, category: 'Wave', desc: 'Wave red' },
      wave_g: { min: 0, max: 1, step: 0.01, default: 1, category: 'Wave', desc: 'Wave green' },
      wave_b: { min: 0, max: 1, step: 0.01, default: 1, category: 'Wave', desc: 'Wave blue' },
      wave_a: { min: 0, max: 1, step: 0.01, default: 1, category: 'Wave', desc: 'Wave alpha' },
      wave_mystery: { min: -1, max: 1, step: 0.01, default: 0, category: 'Wave', desc: 'Wave mystery param' },
      wave_usedots: { min: 0, max: 1, step: 1, default: 0, category: 'Wave', desc: 'Use dots for wave' },
      wave_thick: { min: 0, max: 1, step: 1, default: 0, category: 'Wave', desc: 'Thick wave' },
      wave_additive: { min: 0, max: 1, step: 1, default: 0, category: 'Wave', desc: 'Additive wave blending' },
      wave_brighten: { min: 0, max: 1, step: 1, default: 0, category: 'Wave', desc: 'Brighten wave' },

      // Outer Border
      ob_size: { min: 0, max: 0.5, step: 0.01, default: 0, category: 'Border', desc: 'Outer border size' },
      ob_r: { min: 0, max: 1, step: 0.01, default: 0, category: 'Border', desc: 'Outer border red' },
      ob_g: { min: 0, max: 1, step: 0.01, default: 0, category: 'Border', desc: 'Outer border green' },
      ob_b: { min: 0, max: 1, step: 0.01, default: 0, category: 'Border', desc: 'Outer border blue' },
      ob_a: { min: 0, max: 1, step: 0.01, default: 0, category: 'Border', desc: 'Outer border alpha' },

      // Inner Border
      ib_size: { min: 0, max: 0.5, step: 0.01, default: 0, category: 'Border', desc: 'Inner border size' },
      ib_r: { min: 0, max: 1, step: 0.01, default: 0, category: 'Border', desc: 'Inner border red' },
      ib_g: { min: 0, max: 1, step: 0.01, default: 0, category: 'Border', desc: 'Inner border green' },
      ib_b: { min: 0, max: 1, step: 0.01, default: 0, category: 'Border', desc: 'Inner border blue' },
      ib_a: { min: 0, max: 1, step: 0.01, default: 0, category: 'Border', desc: 'Inner border alpha' },

      // Motion Vectors
      mv_x: { min: 0, max: 64, step: 1, default: 12, category: 'Motion Vectors', desc: 'MV grid X count' },
      mv_y: { min: 0, max: 48, step: 1, default: 9, category: 'Motion Vectors', desc: 'MV grid Y count' },
      mv_dx: { min: -1, max: 1, step: 0.01, default: 0, category: 'Motion Vectors', desc: 'MV X offset' },
      mv_dy: { min: -1, max: 1, step: 0.01, default: 0, category: 'Motion Vectors', desc: 'MV Y offset' },
      mv_l: { min: 0, max: 5, step: 0.1, default: 1, category: 'Motion Vectors', desc: 'MV length' },
      mv_r: { min: 0, max: 1, step: 0.01, default: 1, category: 'Motion Vectors', desc: 'MV red' },
      mv_g: { min: 0, max: 1, step: 0.01, default: 1, category: 'Motion Vectors', desc: 'MV green' },
      mv_b: { min: 0, max: 1, step: 0.01, default: 1, category: 'Motion Vectors', desc: 'MV blue' },
      mv_a: { min: 0, max: 1, step: 0.01, default: 0, category: 'Motion Vectors', desc: 'MV alpha' }
    };

    this.onPresetChange = null;
  }

  loadPreset(preset) {
    this.currentPreset = preset;
    this.editedValues = {};

    // Copy current values
    if (preset && preset.baseVals) {
      for (const key in this.editableParams) {
        if (preset.baseVals[key] !== undefined) {
          this.editedValues[key] = preset.baseVals[key];
        } else {
          this.editedValues[key] = this.editableParams[key].default;
        }
      }
    }
  }

  getValue(param) {
    if (this.editedValues[param] !== undefined) {
      return this.editedValues[param];
    }
    return this.editableParams[param]?.default || 0;
  }

  setValue(param, value) {
    const paramInfo = this.editableParams[param];
    if (!paramInfo) return;

    // Clamp value to range
    value = Math.max(paramInfo.min, Math.min(paramInfo.max, value));
    this.editedValues[param] = value;

    // Apply change to visualizer in real-time
    this.applyChanges();

    if (this.onPresetChange) {
      this.onPresetChange(param, value);
    }
  }

  applyChanges() {
    if (!this.currentPreset || !this.visualizer.visualizer) return;

    // Create modified preset
    const modifiedPreset = {
      ...this.currentPreset,
      baseVals: {
        ...this.currentPreset.baseVals,
        ...this.editedValues
      }
    };

    // Apply to visualizer with no blend time for instant feedback
    this.visualizer.loadPreset(modifiedPreset, 0);
  }

  resetToDefault(param) {
    if (this.currentPreset && this.currentPreset.baseVals[param] !== undefined) {
      this.setValue(param, this.currentPreset.baseVals[param]);
    } else {
      this.setValue(param, this.editableParams[param].default);
    }
  }

  resetAll() {
    if (this.currentPreset) {
      this.loadPreset(this.currentPreset);
      this.applyChanges();
    }
  }

  getCategories() {
    const categories = {};
    for (const [param, info] of Object.entries(this.editableParams)) {
      if (!categories[info.category]) {
        categories[info.category] = [];
      }
      categories[info.category].push({ param, ...info });
    }
    return categories;
  }

  exportPreset() {
    if (!this.currentPreset) return null;

    return {
      ...this.currentPreset,
      baseVals: {
        ...this.currentPreset.baseVals,
        ...this.editedValues
      }
    };
  }

  exportAsMilk() {
    const preset = this.exportPreset();
    if (!preset) return '';

    let milk = '[preset00]\n';

    // Export base values
    for (const [key, value] of Object.entries(preset.baseVals)) {
      if (typeof value === 'number') {
        milk += `${key}=${value}\n`;
      }
    }

    // Export equations if they exist
    if (preset.init_eqs_str) {
      const lines = preset.init_eqs_str.split('\n');
      lines.forEach((line, i) => {
        if (line.trim()) milk += `per_frame_init_${i + 1}=${line}\n`;
      });
    }

    if (preset.frame_eqs_str) {
      const lines = preset.frame_eqs_str.split('\n');
      lines.forEach((line, i) => {
        if (line.trim()) milk += `per_frame_${i + 1}=${line}\n`;
      });
    }

    if (preset.pixel_eqs_str) {
      const lines = preset.pixel_eqs_str.split('\n');
      lines.forEach((line, i) => {
        if (line.trim()) milk += `per_pixel_${i + 1}=${line}\n`;
      });
    }

    return milk;
  }

  downloadPreset(filename = 'custom_preset.milk') {
    const milk = this.exportAsMilk();
    if (!milk) return;

    const blob = new Blob([milk], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
