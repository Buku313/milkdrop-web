import butterchurnPresets from 'butterchurn-presets';

export class PresetManager {
  constructor(visualizer) {
    this.visualizer = visualizer;
    this.presets = {};
    this.presetKeys = [];
    this.currentIndex = 0;
    this.customPresets = {};
  }

  async loadPresets() {
    // Load all butterchurn presets
    // getPresets() returns the main preset collection
    this.presets = butterchurnPresets.getPresets();

    // Try to load extra presets if available
    try {
      if (butterchurnPresets.getPresetsExtra) {
        const extraPresets = butterchurnPresets.getPresetsExtra();
        this.presets = { ...this.presets, ...extraPresets };
      }
    } catch (e) {
      // Extra presets not available
    }

    try {
      if (butterchurnPresets.getPresetsExtra2) {
        const extra2Presets = butterchurnPresets.getPresetsExtra2();
        this.presets = { ...this.presets, ...extra2Presets };
      }
    } catch (e) {
      // Extra2 presets not available
    }

    this.presetKeys = Object.keys(this.presets).sort();
    console.log(`Loaded ${this.presetKeys.length} presets`);
  }

  getPresetList() {
    // Return combined list of built-in and custom presets
    const customKeys = Object.keys(this.customPresets).map(k => `[Custom] ${k}`);
    return [...this.presetKeys, ...customKeys];
  }

  setPreset(index) {
    const allPresets = this.getPresetList();
    if (index >= 0 && index < allPresets.length) {
      this.currentIndex = index;
      const name = allPresets[index];

      let preset;
      if (name.startsWith('[Custom] ')) {
        const customName = name.replace('[Custom] ', '');
        preset = this.customPresets[customName];
      } else {
        preset = this.presets[name];
      }

      if (preset) {
        this.visualizer.loadPreset(preset);
      }
    }
  }

  nextPreset() {
    const total = this.getPresetList().length;
    this.setPreset((this.currentIndex + 1) % total);
  }

  prevPreset() {
    const total = this.getPresetList().length;
    this.setPreset((this.currentIndex - 1 + total) % total);
  }

  setRandomPreset() {
    const total = this.getPresetList().length;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * total);
    } while (newIndex === this.currentIndex && total > 1);
    this.setPreset(newIndex);
  }

  getCurrentPresetName() {
    return this.getPresetList()[this.currentIndex] || 'Unknown';
  }

  getCurrentPreset() {
    const allPresets = this.getPresetList();
    const name = allPresets[this.currentIndex];

    if (name && name.startsWith('[Custom] ')) {
      const customName = name.replace('[Custom] ', '');
      return this.customPresets[customName];
    }

    return this.presets[name] || null;
  }

  async loadCustomPreset(milkContent, filename) {
    // Parse .milk file format
    // MilkDrop presets are INI-like format with sections
    const preset = this.parseMilkFile(milkContent);

    if (!preset) {
      throw new Error('Failed to parse preset file');
    }

    const name = filename.replace('.milk', '');
    this.customPresets[name] = preset;

    // Set as current preset
    const allPresets = this.getPresetList();
    const index = allPresets.indexOf(`[Custom] ${name}`);
    if (index !== -1) {
      this.setPreset(index);
    }
  }

  parseMilkFile(content) {
    // Parse MilkDrop .milk file format
    // This is a simplified parser - complex presets may need full parser
    const lines = content.split('\n');
    const preset = {
      baseVals: {},
      init_eqs_str: '',
      frame_eqs_str: '',
      pixel_eqs_str: '',
      shapes: [],
      waves: [],
      warp: '',
      comp: ''
    };

    let currentSection = '';
    let warpLines = [];
    let compLines = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('//') || trimmed === '') continue;

      // Section headers
      if (trimmed.startsWith('[')) {
        currentSection = trimmed.toLowerCase();
        continue;
      }

      // Parse key=value pairs
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.substring(0, eqIndex).trim().toLowerCase();
      const value = trimmed.substring(eqIndex + 1).trim();

      // Handle different sections
      if (currentSection === '[preset00]' || currentSection === '') {
        // Per-frame init equations
        if (key.startsWith('per_frame_init_')) {
          preset.init_eqs_str += value + '\n';
        }
        // Per-frame equations
        else if (key.startsWith('per_frame_') && !key.startsWith('per_frame_init')) {
          preset.frame_eqs_str += value + '\n';
        }
        // Per-pixel equations
        else if (key.startsWith('per_pixel_')) {
          preset.pixel_eqs_str += value + '\n';
        }
        // Warp shader
        else if (key.startsWith('warp_')) {
          warpLines.push(value);
        }
        // Composite shader
        else if (key.startsWith('comp_')) {
          compLines.push(value);
        }
        // Base values
        else {
          const numVal = parseFloat(value);
          preset.baseVals[key] = isNaN(numVal) ? value : numVal;
        }
      }
    }

    // Join shader lines
    preset.warp = warpLines.join('\n');
    preset.comp = compLines.join('\n');

    // Return in butterchurn-compatible format
    return {
      baseVals: preset.baseVals,
      init_eqs_str: preset.init_eqs_str,
      frame_eqs_str: preset.frame_eqs_str,
      pixel_eqs_str: preset.pixel_eqs_str,
      shapes: preset.shapes,
      waves: preset.waves,
      warp: preset.warp,
      comp: preset.comp
    };
  }
}
