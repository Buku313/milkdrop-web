export class UIController {
  constructor(app) {
    this.app = app;
    this.controlsCollapsed = false;
    this.presetNameTimeout = null;
    this.effectsPanelOpen = false;
    this.editorPanelOpen = false;

    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.populatePresetList();
    this.setupEffectsPanel();
    this.setupEditorPanel();
  }

  setupEventListeners() {
    // Audio source buttons
    document.getElementById('btn-microphone').addEventListener('click', () => {
      this.app.connectMicrophone();
    });

    document.getElementById('btn-screen').addEventListener('click', () => {
      this.app.connectSystemAudio();
    });

    document.getElementById('btn-file').addEventListener('click', () => {
      document.getElementById('audio-file-input').click();
    });

    document.getElementById('audio-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.app.connectAudioFile(file);
      }
    });

    // Device selector
    document.getElementById('btn-refresh-devices').addEventListener('click', () => {
      this.refreshDeviceList();
    });

    document.getElementById('btn-connect-device').addEventListener('click', () => {
      this.connectSelectedDevice();
    });

    // Preset controls
    document.getElementById('btn-random').addEventListener('click', () => {
      this.app.randomPreset();
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
      this.app.prevPreset();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      this.app.nextPreset();
    });

    document.getElementById('preset-select').addEventListener('change', (e) => {
      this.app.setPreset(parseInt(e.target.value, 10));
    });

    // Auto-cycle
    document.getElementById('auto-cycle').addEventListener('change', (e) => {
      if (e.target.checked) {
        const interval = parseInt(document.getElementById('cycle-interval').value, 10);
        this.app.startAutoCycle(interval);
      } else {
        this.app.stopAutoCycle();
      }
    });

    document.getElementById('cycle-interval').addEventListener('change', (e) => {
      if (document.getElementById('auto-cycle').checked) {
        this.app.startAutoCycle(parseInt(e.target.value, 10));
      }
    });

    // Custom preset
    document.getElementById('btn-load-preset').addEventListener('click', () => {
      document.getElementById('preset-file-input').click();
    });

    document.getElementById('preset-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.app.loadCustomPreset(file);
      }
    });

    // Settings
    const sensitivitySlider = document.getElementById('sensitivity');
    const sensitivityValue = document.getElementById('sensitivity-value');
    sensitivitySlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      sensitivityValue.textContent = value.toFixed(1);
      this.app.setSensitivity(value);
    });

    const blendTimeSlider = document.getElementById('blend-time');
    const blendTimeValue = document.getElementById('blend-time-value');
    blendTimeSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      blendTimeValue.textContent = value.toFixed(1);
      this.app.setBlendTime(value);
    });

    // Fullscreen
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      this.app.toggleFullscreen();
    });

    // Toggle controls
    document.getElementById('toggle-controls').addEventListener('click', () => {
      this.toggleControls();
    });

    // Start auto-cycle if checked by default
    if (document.getElementById('auto-cycle').checked) {
      const interval = parseInt(document.getElementById('cycle-interval').value, 10);
      this.app.startAutoCycle(interval);
    }
  }

  async refreshDeviceList() {
    const select = document.getElementById('device-select');
    select.innerHTML = '<option value="">Scanning devices...</option>';

    try {
      const devices = await this.app.enumerateAudioDevices();
      select.innerHTML = '';

      if (devices.length === 0) {
        select.innerHTML = '<option value="">No audio devices found</option>';
        return;
      }

      // Add a default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = '-- Select an audio device --';
      select.appendChild(defaultOption);

      // Group devices: monitors first, then regular inputs
      const monitorDevices = devices.filter(d => d.isMonitor);
      const inputDevices = devices.filter(d => !d.isMonitor);

      // Add monitor devices with highlighting
      if (monitorDevices.length > 0) {
        const monitorGroup = document.createElement('optgroup');
        monitorGroup.label = '🔊 Monitor Sources (System Audio)';

        monitorDevices.forEach(device => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = `★ ${device.label}`;
          option.style.color = '#44cc88';
          option.dataset.monitor = 'true';
          monitorGroup.appendChild(option);
        });

        select.appendChild(monitorGroup);
      }

      // Add regular input devices
      if (inputDevices.length > 0) {
        const inputGroup = document.createElement('optgroup');
        inputGroup.label = '🎤 Input Devices';

        inputDevices.forEach(device => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.textContent = device.label;
          inputGroup.appendChild(option);
        });

        select.appendChild(inputGroup);
      }

      // Auto-select first monitor device if available
      if (monitorDevices.length > 0) {
        select.value = monitorDevices[0].deviceId;
        this.setAudioStatus(`Found ${monitorDevices.length} monitor source(s)`, 'active');
      } else {
        this.setAudioStatus(`Found ${devices.length} device(s), no monitor sources`, '');
      }

    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      select.innerHTML = '<option value="">Error scanning devices</option>';
      this.setAudioStatus('Failed to scan devices - check permissions', 'error');
    }
  }

  async connectSelectedDevice() {
    const select = document.getElementById('device-select');
    const deviceId = select.value;

    if (!deviceId) {
      this.setAudioStatus('Please select a device first', 'error');
      return;
    }

    try {
      const deviceName = await this.app.connectDevice(deviceId);
      this.setAudioStatus(`Connected: ${deviceName}`, 'active');
      this.setActiveSource('device');
    } catch (error) {
      console.error('Failed to connect device:', error);
      this.setAudioStatus(`Failed to connect: ${error.message}`, 'error');
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          this.app.toggleFullscreen();
          break;
        case 'h':
          this.toggleControls();
          break;
        case 'r':
          this.app.randomPreset();
          break;
        case 'arrowleft':
          this.app.prevPreset();
          break;
        case 'arrowright':
          this.app.nextPreset();
          break;
        case ' ':
          e.preventDefault();
          this.app.randomPreset();
          break;
        case 'm':
          this.app.connectMicrophone();
          break;
        case 's':
          this.app.connectSystemAudio();
          break;
        case 'd':
          this.refreshDeviceList();
          break;
        case 'e':
          this.toggleEditorPanel();
          break;
        case 'x':
          this.toggleEffectsPanel();
          break;
        case 'escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else if (this.effectsPanelOpen) {
            this.toggleEffectsPanel(false);
          } else if (this.editorPanelOpen) {
            this.toggleEditorPanel(false);
          }
          break;
      }
    });
  }

  populatePresetList() {
    const select = document.getElementById('preset-select');
    select.innerHTML = '';

    const presets = this.app.getPresetList();
    presets.forEach((name, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = name;
      select.appendChild(option);
    });
  }

  updatePresetSelect() {
    const select = document.getElementById('preset-select');
    select.value = this.app.getCurrentPresetIndex();
  }

  toggleControls() {
    const controls = document.getElementById('controls');
    this.controlsCollapsed = !this.controlsCollapsed;
    controls.classList.toggle('collapsed', this.controlsCollapsed);
  }

  setAudioStatus(message, type = '') {
    const status = document.getElementById('audio-status');
    status.textContent = message;
    status.className = 'status';
    if (type) {
      status.classList.add(type);
    }
  }

  setActiveSource(source) {
    const buttons = ['microphone', 'screen', 'file'];
    buttons.forEach(btn => {
      const el = document.getElementById(`btn-${btn}`);
      el.classList.toggle('active', btn === source);
    });
    // Also handle device button
    const connectBtn = document.getElementById('btn-connect-device');
    connectBtn.classList.toggle('active', source === 'device');
  }

  showAudioPlayer(show) {
    const container = document.getElementById('audio-player-container');
    container.classList.toggle('hidden', !show);
  }

  showPresetName(name) {
    const overlay = document.getElementById('overlay');
    const presetNameEl = document.getElementById('preset-name');

    presetNameEl.textContent = name;
    presetNameEl.style.color = '';
    overlay.classList.remove('hidden');

    // Update select dropdown
    this.updatePresetSelect();

    // Hide after 3 seconds
    if (this.presetNameTimeout) {
      clearTimeout(this.presetNameTimeout);
    }
    this.presetNameTimeout = setTimeout(() => {
      overlay.classList.add('hidden');
    }, 3000);
  }

  setupEffectsPanel() {
    // Toggle effects panel
    document.getElementById('btn-effects-panel').addEventListener('click', () => {
      this.toggleEffectsPanel();
    });

    document.getElementById('close-effects').addEventListener('click', () => {
      this.toggleEffectsPanel(false);
    });

    // Logo controls
    document.getElementById('btn-load-logo').addEventListener('click', () => {
      document.getElementById('logo-file-input').click();
    });

    document.getElementById('logo-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.app.loadLogo(file);
        document.getElementById('btn-remove-logo').disabled = false;
      }
    });

    document.getElementById('btn-remove-logo').addEventListener('click', () => {
      this.app.removeLogo();
      document.getElementById('btn-remove-logo').disabled = true;
    });

    // Logo position/scale/opacity sliders
    this.setupSlider('logo-x', (value) => {
      this.app.setLogoPosition(value, parseFloat(document.getElementById('logo-y').value));
    });

    this.setupSlider('logo-y', (value) => {
      this.app.setLogoPosition(parseFloat(document.getElementById('logo-x').value), value);
    });

    this.setupSlider('logo-scale', (value) => {
      this.app.setLogoScale(value);
    });

    this.setupSlider('logo-opacity', (value) => {
      this.app.setLogoOpacity(value);
    });

    // Logo animation
    document.getElementById('logo-animation').addEventListener('change', (e) => {
      const animation = e.target.value;
      this.app.setLogoAnimation(animation !== 'none', animation, 1);
    });

    // Logo audio reactivity controls
    document.getElementById('logo-react-enabled').addEventListener('change', (e) => {
      this.app.setLogoReactivity({ enabled: e.target.checked });
    });

    this.setupSlider('logo-react-scale', (value) => {
      this.app.setLogoReactivity({ scaleAmount: value });
    });

    document.getElementById('logo-react-scale-band').addEventListener('change', (e) => {
      this.app.setLogoReactivity({ scaleBand: e.target.value });
    });

    this.setupSlider('logo-react-rotation', (value) => {
      this.app.setLogoReactivity({ rotationAmount: value });
    });

    document.getElementById('logo-react-rotation-band').addEventListener('change', (e) => {
      this.app.setLogoReactivity({ rotationBand: e.target.value });
    });

    this.setupSlider('logo-react-wobble', (value) => {
      this.app.setLogoReactivity({ wobbleAmount: value });
    });

    this.setupSlider('logo-react-opacity', (value) => {
      this.app.setLogoReactivity({ opacityAmount: value });
    });

    document.getElementById('logo-color-tint').addEventListener('change', (e) => {
      this.app.setLogoReactivity({ colorTint: e.target.checked });
    });

    document.getElementById('logo-blend-mode').addEventListener('change', (e) => {
      this.app.setLogoBlendMode(e.target.value);
    });

    // Effect toggles
    this.setupEffectToggle('flash', 'effect-flash');
    this.setupEffectToggle('border', 'effect-border');
    this.setupEffectToggle('vignette', 'effect-vignette');
    this.setupEffectToggle('scanlines', 'effect-scanlines');
    this.setupEffectToggle('colorOverlay', 'effect-overlay');

    // Flash settings
    document.getElementById('flash-color').addEventListener('input', (e) => {
      this.app.setEffect('flash', { color: e.target.value });
    });

    // Border settings
    document.getElementById('border-color').addEventListener('input', (e) => {
      this.app.setEffect('border', { color: e.target.value });
    });

    document.getElementById('border-width').addEventListener('input', (e) => {
      this.app.setEffect('border', { width: parseInt(e.target.value) });
    });

    document.getElementById('border-pulse').addEventListener('change', (e) => {
      this.app.setEffect('border', { pulse: e.target.checked });
    });

    // Vignette settings
    document.getElementById('vignette-intensity').addEventListener('input', (e) => {
      this.app.setEffect('vignette', { intensity: parseFloat(e.target.value) });
    });

    // Scanlines settings
    document.getElementById('scanlines-opacity').addEventListener('input', (e) => {
      this.app.setEffect('scanlines', { opacity: parseFloat(e.target.value) });
    });

    // Color overlay settings
    document.getElementById('overlay-color').addEventListener('input', (e) => {
      this.app.setEffect('colorOverlay', { color: e.target.value });
    });

    document.getElementById('overlay-opacity').addEventListener('input', (e) => {
      this.app.setEffect('colorOverlay', { opacity: parseFloat(e.target.value) });
    });

    document.getElementById('overlay-blend').addEventListener('change', (e) => {
      this.app.setEffect('colorOverlay', { blendMode: e.target.value });
    });
  }

  setupSlider(id, callback) {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(`${id}-value`);

    slider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      if (valueDisplay) {
        valueDisplay.textContent = value.toFixed(2);
      }
      callback(value);
    });
  }

  setupEffectToggle(effectName, checkboxId) {
    document.getElementById(checkboxId).addEventListener('change', (e) => {
      this.app.toggleEffect(effectName, e.target.checked);
    });
  }

  toggleEffectsPanel(show = null) {
    const panel = document.getElementById('effects-panel');
    this.effectsPanelOpen = show !== null ? show : !this.effectsPanelOpen;
    panel.classList.toggle('hidden', !this.effectsPanelOpen);

    // Close editor panel if open
    if (this.effectsPanelOpen && this.editorPanelOpen) {
      this.toggleEditorPanel(false);
    }
  }

  setupEditorPanel() {
    // Toggle editor panel
    document.getElementById('btn-editor-panel').addEventListener('click', () => {
      this.toggleEditorPanel();
    });

    document.getElementById('close-editor').addEventListener('click', () => {
      this.toggleEditorPanel(false);
    });

    // Reset button
    document.getElementById('btn-reset-preset').addEventListener('click', () => {
      this.app.resetPresetEditor();
      this.updateEditorUI();
    });

    // Export button
    document.getElementById('btn-export-preset').addEventListener('click', () => {
      this.app.exportPreset();
    });
  }

  toggleEditorPanel(show = null) {
    const panel = document.getElementById('editor-panel');
    this.editorPanelOpen = show !== null ? show : !this.editorPanelOpen;
    panel.classList.toggle('hidden', !this.editorPanelOpen);

    // Close effects panel if open
    if (this.editorPanelOpen && this.effectsPanelOpen) {
      this.toggleEffectsPanel(false);
    }

    // Build editor UI if opening
    if (this.editorPanelOpen) {
      this.buildEditorUI();
    }
  }

  buildEditorUI() {
    const container = document.getElementById('editor-params');
    container.innerHTML = '';

    const categories = this.app.getPresetEditorCategories();

    for (const [categoryName, params] of Object.entries(categories)) {
      const section = document.createElement('section');
      section.className = 'panel-section';

      const header = document.createElement('h3');
      header.textContent = categoryName;
      header.className = 'collapsible';
      header.addEventListener('click', () => {
        section.classList.toggle('collapsed');
      });
      section.appendChild(header);

      const paramsContainer = document.createElement('div');
      paramsContainer.className = 'editor-params-list';

      for (const paramInfo of params) {
        const row = document.createElement('div');
        row.className = 'setting-row';
        row.title = paramInfo.desc;

        const label = document.createElement('label');
        label.textContent = paramInfo.param;
        label.htmlFor = `editor-${paramInfo.param}`;

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `editor-${paramInfo.param}`;
        slider.min = paramInfo.min;
        slider.max = paramInfo.max;
        slider.step = paramInfo.step;
        slider.value = this.app.getPresetEditorValue(paramInfo.param);

        const valueSpan = document.createElement('span');
        valueSpan.id = `editor-${paramInfo.param}-value`;
        valueSpan.textContent = parseFloat(slider.value).toFixed(2);

        slider.addEventListener('input', (e) => {
          const value = parseFloat(e.target.value);
          valueSpan.textContent = value.toFixed(2);
          this.app.setPresetEditorValue(paramInfo.param, value);
        });

        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(valueSpan);
        paramsContainer.appendChild(row);
      }

      section.appendChild(paramsContainer);
      container.appendChild(section);
    }
  }

  updateEditorUI() {
    // Update all editor sliders with current values
    const categories = this.app.getPresetEditorCategories();

    for (const params of Object.values(categories)) {
      for (const paramInfo of params) {
        const slider = document.getElementById(`editor-${paramInfo.param}`);
        const valueSpan = document.getElementById(`editor-${paramInfo.param}-value`);

        if (slider && valueSpan) {
          const value = this.app.getPresetEditorValue(paramInfo.param);
          slider.value = value;
          valueSpan.textContent = parseFloat(value).toFixed(2);
        }
      }
    }
  }
}
