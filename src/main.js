import { AudioManager } from './audio.js';
import { VisualizerEngine } from './visualizer.js';
import { PresetManager } from './presets.js';
import { UIController } from './ui.js';
import { EffectsManager } from './effects.js';
import { PresetEditor } from './presetEditor.js';

class MilkDropWeb {
  constructor() {
    this.canvas = document.getElementById('visualizer');
    this.audioManager = null;
    this.visualizer = null;
    this.presetManager = null;
    this.effectsManager = null;
    this.presetEditor = null;
    this.ui = null;
    this.isRunning = false;
    this.cycleInterval = null;
    this.lastFrameTime = 0;
  }

  async init() {
    try {
      // Initialize visualizer engine (Butterchurn)
      this.visualizer = new VisualizerEngine(this.canvas);
      await this.visualizer.init();

      // Initialize audio manager with shared AudioContext
      this.audioManager = new AudioManager();
      this.audioManager.setAudioContext(this.visualizer.getAudioContext());

      // Set up callback to connect audio to visualizer
      this.audioManager.onAudioConnected = (analyser) => {
        this.visualizer.connectAudio(analyser);
      };

      // Initialize preset manager
      this.presetManager = new PresetManager(this.visualizer);
      await this.presetManager.loadPresets();

      // Initialize effects manager
      this.effectsManager = new EffectsManager(this.canvas);

      // Initialize preset editor
      this.presetEditor = new PresetEditor(this.visualizer, this.presetManager);

      // Initialize UI
      this.ui = new UIController(this);

      // Set up resize handler
      this.setupResizeHandler();

      // Start render loop
      this.startRenderLoop();

      // Set initial preset
      this.presetManager.setRandomPreset();

      // Load preset into editor
      this.updateEditorPreset();

      console.log('MilkDrop Web initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MilkDrop Web:', error);
      this.showError('Failed to initialize visualizer. WebGL 2 is required.');
    }
  }

  setupResizeHandler() {
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;

      if (this.visualizer) {
        this.visualizer.setSize(width, height);
      }

      if (this.effectsManager) {
        this.effectsManager.resize();
      }
    };

    resize();
    window.addEventListener('resize', resize);
  }

  startRenderLoop() {
    const render = (timestamp) => {
      const deltaTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;

      if (this.visualizer) {
        this.visualizer.render();
      }

      // Update effects with audio data
      if (this.effectsManager) {
        // Get audio levels if connected
        if (this.audioManager && this.audioManager.isConnected) {
          const analyser = this.audioManager.getAnalyser();
          if (analyser) {
            const frequencyData = new Float32Array(analyser.frequencyBinCount);
            analyser.getFloatFrequencyData(frequencyData);

            // Calculate bass, mid, treble
            const bass = this.getFrequencyRange(frequencyData, 0, 0.1);
            const mid = this.getFrequencyRange(frequencyData, 0.1, 0.5);
            const treble = this.getFrequencyRange(frequencyData, 0.5, 1.0);

            this.effectsManager.setBeatIntensity(bass, mid, treble);
          }
        }

        this.effectsManager.render(deltaTime);
      }

      requestAnimationFrame(render);
    };

    this.isRunning = true;
    requestAnimationFrame(render);
  }

  getFrequencyRange(frequencyData, start, end) {
    const startIndex = Math.floor(start * frequencyData.length);
    const endIndex = Math.floor(end * frequencyData.length);
    let sum = 0;
    for (let i = startIndex; i < endIndex; i++) {
      // Convert from dB to linear (0-1)
      let value = (frequencyData[i] + 100) / 100;
      value = Math.max(0, Math.min(1, value));
      sum += value;
    }
    return sum / (endIndex - startIndex);
  }

  async connectMicrophone() {
    try {
      await this.audioManager.connectMicrophone();
      this.ui.setAudioStatus('Microphone connected', 'active');
      this.ui.setActiveSource('microphone');
    } catch (error) {
      console.error('Microphone error:', error);
      this.ui.setAudioStatus('Microphone access denied', 'error');
    }
  }

  async connectSystemAudio() {
    try {
      const result = await this.audioManager.connectSystemAudio();
      this.ui.setAudioStatus(result || 'System audio connected', 'active');
      this.ui.setActiveSource('screen');
    } catch (error) {
      console.error('System audio error:', error);
      this.ui.setAudioStatus(error.message || 'System audio failed', 'error');
    }
  }

  async enumerateAudioDevices() {
    return await this.audioManager.enumerateAudioDevices();
  }

  async connectDevice(deviceId) {
    return await this.audioManager.connectDevice(deviceId);
  }

  async connectAudioFile(file) {
    try {
      await this.audioManager.connectAudioFile(file);
      this.ui.setAudioStatus(`Playing: ${file.name}`, 'active');
      this.ui.setActiveSource('file');
      this.ui.showAudioPlayer(true);
    } catch (error) {
      console.error('Audio file error:', error);
      this.ui.setAudioStatus('Failed to load audio file', 'error');
    }
  }

  nextPreset() {
    this.presetManager.nextPreset();
    this.showPresetName();
    this.updateEditorPreset();
  }

  prevPreset() {
    this.presetManager.prevPreset();
    this.showPresetName();
    this.updateEditorPreset();
  }

  randomPreset() {
    this.presetManager.setRandomPreset();
    this.showPresetName();
    this.updateEditorPreset();
  }

  setPreset(index) {
    this.presetManager.setPreset(index);
    this.showPresetName();
    this.updateEditorPreset();
  }

  showPresetName() {
    const name = this.presetManager.getCurrentPresetName();
    this.ui.showPresetName(name);
  }

  updateEditorPreset() {
    if (this.presetEditor) {
      const preset = this.presetManager.getCurrentPreset();
      this.presetEditor.loadPreset(preset);
      if (this.ui) {
        this.ui.updateEditorUI();
      }
    }
  }

  startAutoCycle(intervalSeconds) {
    this.stopAutoCycle();
    this.cycleInterval = setInterval(() => {
      this.randomPreset();
    }, intervalSeconds * 1000);
  }

  stopAutoCycle() {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
  }

  setSensitivity(value) {
    if (this.audioManager) {
      this.audioManager.setSensitivity(value);
    }
  }

  setBlendTime(value) {
    if (this.visualizer) {
      this.visualizer.setBlendTime(value);
    }
  }

  async loadCustomPreset(file) {
    try {
      const text = await file.text();
      await this.presetManager.loadCustomPreset(text, file.name);
      this.ui.setAudioStatus(`Loaded preset: ${file.name}`, 'active');
      this.showPresetName();
      this.ui.populatePresetList();
      this.updateEditorPreset();
    } catch (error) {
      console.error('Failed to load preset:', error);
      this.ui.setAudioStatus('Failed to load preset file', 'error');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  showError(message) {
    const overlay = document.getElementById('overlay');
    const presetName = document.getElementById('preset-name');
    presetName.textContent = message;
    presetName.style.color = '#ff6666';
    overlay.classList.remove('hidden');
  }

  getPresetList() {
    return this.presetManager.getPresetList();
  }

  getCurrentPresetIndex() {
    return this.presetManager.currentIndex;
  }

  getAudioPlayer() {
    return this.audioManager.audioElement;
  }

  // Effects methods
  async loadLogo(file) {
    if (this.effectsManager) {
      await this.effectsManager.loadLogo(file);
    }
  }

  removeLogo() {
    if (this.effectsManager) {
      this.effectsManager.removeLogo();
    }
  }

  setLogoPosition(x, y) {
    if (this.effectsManager) {
      this.effectsManager.setLogoPosition(x, y);
    }
  }

  setLogoScale(scale) {
    if (this.effectsManager) {
      this.effectsManager.setLogoScale(scale);
    }
  }

  setLogoOpacity(opacity) {
    if (this.effectsManager) {
      this.effectsManager.setLogoOpacity(opacity);
    }
  }

  setLogoAnimation(enabled, type, speed) {
    if (this.effectsManager) {
      this.effectsManager.setLogoAnimation(enabled, type, speed);
    }
  }

  setLogoReactivity(settings) {
    if (this.effectsManager) {
      this.effectsManager.setLogoReactivity(settings);
    }
  }

  setLogoBlendMode(mode) {
    if (this.effectsManager) {
      this.effectsManager.setLogoBlendMode(mode);
    }
  }

  setEffect(effectName, settings) {
    if (this.effectsManager) {
      this.effectsManager.setEffect(effectName, settings);
    }
  }

  toggleEffect(effectName, enabled) {
    if (this.effectsManager) {
      this.effectsManager.toggleEffect(effectName, enabled);
    }
  }

  // Preset editor methods
  getPresetEditorCategories() {
    if (this.presetEditor) {
      return this.presetEditor.getCategories();
    }
    return {};
  }

  getPresetEditorValue(param) {
    if (this.presetEditor) {
      return this.presetEditor.getValue(param);
    }
    return 0;
  }

  setPresetEditorValue(param, value) {
    if (this.presetEditor) {
      this.presetEditor.setValue(param, value);
    }
  }

  resetPresetEditor() {
    if (this.presetEditor) {
      this.presetEditor.resetAll();
    }
  }

  exportPreset() {
    if (this.presetEditor) {
      const presetName = this.presetManager.getCurrentPresetName();
      const filename = presetName.replace(/[^a-z0-9]/gi, '_') + '_edited.milk';
      this.presetEditor.downloadPreset(filename);
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new MilkDropWeb();
  await app.init();
  window.milkdropApp = app; // Expose for debugging
});
