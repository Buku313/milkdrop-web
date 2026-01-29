/**
 * Effects Manager - Handles logo overlay and additional visual effects
 * Logo layer is audio-reactive like MilkDrop sprites
 */
export class EffectsManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = null;
    this.effectsCanvas = null;
    this.effectsCtx = null;

    // Audio data for reactive effects
    this.audio = {
      bass: 0,
      mid: 0,
      treble: 0,
      bassSmooth: 0,
      midSmooth: 0,
      trebleSmooth: 0,
      bassAttack: 0,
      midAttack: 0,
      trebleAttack: 0,
      volume: 0
    };

    // Logo settings - MilkDrop sprite-like behavior
    this.logo = {
      enabled: false,
      image: null,
      // Base position (0-1 relative)
      x: 0.5,
      y: 0.5,
      baseScale: 0.2,
      baseOpacity: 0.8,
      baseRotation: 0,
      // Current animated values
      scale: 0.2,
      opacity: 0.8,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
      // Animation settings
      animate: true,
      animationType: 'beatPulse',
      animationSpeed: 1,
      // Audio reactivity settings (like MilkDrop sprite)
      reactivity: {
        enabled: true,
        // Scale reacts to bass
        scaleAmount: 0.3,
        scaleBand: 'bass',
        // Rotation reacts to mid
        rotationAmount: 0.5,
        rotationBand: 'mid',
        // Position wobble reacts to treble
        wobbleAmount: 0.02,
        wobbleBand: 'treble',
        // Opacity pulse
        opacityAmount: 0.3,
        opacityBand: 'bass',
        // Color tint from audio
        colorTint: true,
        // Blend mode
        blendMode: 'lighter' // lighter, screen, overlay, normal
      }
    };

    // Effects settings
    this.effects = {
      flash: {
        enabled: false,
        intensity: 0,
        decay: 0.9,
        onBeat: true,
        color: '#ffffff'
      },
      border: {
        enabled: false,
        width: 10,
        color: '#8866ff',
        glow: true,
        pulse: false
      },
      colorOverlay: {
        enabled: false,
        color: '#ff0000',
        opacity: 0.2,
        blendMode: 'overlay'
      },
      vignette: {
        enabled: false,
        intensity: 0.5,
        color: '#000000'
      },
      scanlines: {
        enabled: false,
        opacity: 0.1,
        spacing: 4
      },
      chromaticAberration: {
        enabled: false,
        intensity: 3
      },
      mirrorMode: {
        enabled: false,
        axis: 'horizontal' // horizontal, vertical, quad
      }
    };

    this.animationTime = 0;
    this.beatIntensity = 0;

    this.init();
  }

  init() {
    // Create overlay canvas for effects
    this.effectsCanvas = document.createElement('canvas');
    this.effectsCanvas.id = 'effects-canvas';
    this.effectsCanvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    this.canvas.parentElement.appendChild(this.effectsCanvas);
    this.effectsCtx = this.effectsCanvas.getContext('2d');

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.effectsCanvas.width = window.innerWidth * dpr;
    this.effectsCanvas.height = window.innerHeight * dpr;
    this.effectsCanvas.style.width = `${window.innerWidth}px`;
    this.effectsCanvas.style.height = `${window.innerHeight}px`;
    this.effectsCtx.scale(dpr, dpr);
  }

  // Logo methods
  async loadLogo(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.logo.image = img;
        this.logo.enabled = true;
        resolve(img);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  setLogoFromURL(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.logo.image = img;
        this.logo.enabled = true;
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  removeLogo() {
    this.logo.image = null;
    this.logo.enabled = false;
  }

  setLogoPosition(x, y) {
    this.logo.x = Math.max(0, Math.min(1, x));
    this.logo.y = Math.max(0, Math.min(1, y));
  }

  setLogoScale(scale) {
    this.logo.baseScale = Math.max(0.01, Math.min(2, scale));
    this.logo.scale = this.logo.baseScale;
  }

  setLogoOpacity(opacity) {
    this.logo.baseOpacity = Math.max(0, Math.min(1, opacity));
    this.logo.opacity = this.logo.baseOpacity;
  }

  setLogoAnimation(enabled, type = 'pulse', speed = 1) {
    this.logo.animate = enabled;
    this.logo.animationType = type;
    this.logo.animationSpeed = speed;
  }

  setLogoReactivity(settings) {
    Object.assign(this.logo.reactivity, settings);
  }

  setLogoBlendMode(mode) {
    this.logo.reactivity.blendMode = mode;
  }

  // Effect triggers
  triggerFlash(intensity = 1) {
    if (this.effects.flash.enabled) {
      this.effects.flash.intensity = Math.min(1, this.effects.flash.intensity + intensity);
    }
  }

  setBeatIntensity(bass, mid, treble) {
    // Store previous values for attack detection
    const prevBass = this.audio.bassSmooth;
    const prevMid = this.audio.midSmooth;
    const prevTreble = this.audio.trebleSmooth;

    // Raw values
    this.audio.bass = bass;
    this.audio.mid = mid;
    this.audio.treble = treble;
    this.audio.volume = (bass + mid + treble) / 3;

    // Smoothed values (for fluid animation)
    const smoothing = 0.3;
    this.audio.bassSmooth = this.audio.bassSmooth * (1 - smoothing) + bass * smoothing;
    this.audio.midSmooth = this.audio.midSmooth * (1 - smoothing) + mid * smoothing;
    this.audio.trebleSmooth = this.audio.trebleSmooth * (1 - smoothing) + treble * smoothing;

    // Attack detection (sudden increases)
    this.audio.bassAttack = Math.max(0, bass - prevBass) * 3;
    this.audio.midAttack = Math.max(0, mid - prevMid) * 3;
    this.audio.trebleAttack = Math.max(0, treble - prevTreble) * 3;

    // Legacy
    this.beatIntensity = Math.max(bass, mid * 0.7, treble * 0.5);

    // Trigger flash on strong beats
    if (this.effects.flash.onBeat && bass > 0.7) {
      this.triggerFlash(bass * 0.5);
    }
  }

  // Get audio value by band name
  getAudioBand(band, smooth = true) {
    switch (band) {
      case 'bass': return smooth ? this.audio.bassSmooth : this.audio.bass;
      case 'mid': return smooth ? this.audio.midSmooth : this.audio.mid;
      case 'treble': return smooth ? this.audio.trebleSmooth : this.audio.treble;
      case 'volume': return this.audio.volume;
      case 'bassAttack': return this.audio.bassAttack;
      case 'midAttack': return this.audio.midAttack;
      case 'trebleAttack': return this.audio.trebleAttack;
      default: return 0;
    }
  }

  // Main render loop
  render(deltaTime = 16) {
    this.animationTime += deltaTime * 0.001;

    const ctx = this.effectsCtx;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Apply effects in order
    this.renderVignette(ctx, width, height);
    this.renderColorOverlay(ctx, width, height);
    this.renderScanlines(ctx, width, height);
    this.renderBorder(ctx, width, height);
    this.renderFlash(ctx, width, height);
    this.renderLogo(ctx, width, height);

    // Decay flash
    this.effects.flash.intensity *= this.effects.flash.decay;
  }

  renderLogo(ctx, width, height) {
    if (!this.logo.enabled || !this.logo.image) return;

    const img = this.logo.image;
    const t = this.animationTime * this.logo.animationSpeed;
    const react = this.logo.reactivity;

    // Start with base values
    let scale = this.logo.baseScale;
    let opacity = this.logo.baseOpacity;
    let rotation = this.logo.baseRotation;
    let offsetX = 0;
    let offsetY = 0;

    // Apply audio reactivity (MilkDrop sprite-like behavior)
    if (react.enabled) {
      // Scale reacts to selected band
      const scaleAudio = this.getAudioBand(react.scaleBand);
      scale *= 1 + scaleAudio * react.scaleAmount;

      // Rotation reacts to selected band
      const rotAudio = this.getAudioBand(react.rotationBand);
      rotation += rotAudio * react.rotationAmount * Math.PI;

      // Position wobble
      const wobbleAudio = this.getAudioBand(react.wobbleBand);
      offsetX = Math.sin(t * 3) * wobbleAudio * react.wobbleAmount * width;
      offsetY = Math.cos(t * 2.5) * wobbleAudio * react.wobbleAmount * height;

      // Opacity pulse
      const opacityAudio = this.getAudioBand(react.opacityBand);
      opacity = Math.min(1, this.logo.baseOpacity * (1 - react.opacityAmount * 0.5) + opacityAudio * react.opacityAmount);
    }

    // Apply additional animation modes
    if (this.logo.animate) {
      switch (this.logo.animationType) {
        case 'pulse':
          scale *= 1 + Math.sin(t * 2) * 0.1;
          opacity *= 0.85 + Math.sin(t * 2) * 0.15;
          break;
        case 'rotate':
          rotation += t * 0.5;
          break;
        case 'bounce':
          scale *= 1 + Math.abs(Math.sin(t * 3)) * 0.15;
          break;
        case 'beatPulse':
          // Enhanced beat pulse using attack for snappier response
          const attack = this.audio.bassAttack;
          scale *= 1 + attack * 0.5 + this.audio.bassSmooth * 0.2;
          break;
        case 'orbit':
          // Orbit around center based on audio
          const orbitRadius = 0.1 + this.audio.midSmooth * 0.1;
          offsetX += Math.sin(t * 2) * orbitRadius * width;
          offsetY += Math.cos(t * 2) * orbitRadius * height;
          break;
        case 'shake':
          // Shake on beats
          const shakeIntensity = this.audio.bassAttack * 20;
          offsetX += (Math.random() - 0.5) * shakeIntensity;
          offsetY += (Math.random() - 0.5) * shakeIntensity;
          break;
        case 'breathe':
          // Slow breathing with audio modulation
          const breathe = Math.sin(t * 0.5) * 0.1;
          scale *= 1 + breathe + this.audio.volume * 0.2;
          break;
      }
    }

    // Store current animated values
    this.logo.scale = scale;
    this.logo.opacity = opacity;
    this.logo.rotation = rotation;
    this.logo.offsetX = offsetX;
    this.logo.offsetY = offsetY;

    // Calculate final position
    const imgWidth = img.width * scale;
    const imgHeight = img.height * scale;
    const x = this.logo.x * width + offsetX;
    const y = this.logo.y * height + offsetY;

    ctx.save();

    // Apply blend mode for integration with visualizer
    if (react.enabled && react.blendMode !== 'normal') {
      ctx.globalCompositeOperation = react.blendMode;
    }

    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Apply color tint based on audio
    if (react.enabled && react.colorTint) {
      // Draw with color overlay based on frequency bands
      ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);

      // Add color tint layer
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = opacity * 0.4;

      // Color based on dominant frequency
      const r = Math.floor(128 + this.audio.bassSmooth * 127);
      const g = Math.floor(128 + this.audio.midSmooth * 127);
      const b = Math.floor(128 + this.audio.trebleSmooth * 127);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(-imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    } else {
      ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    }

    ctx.restore();
  }

  renderFlash(ctx, width, height) {
    if (!this.effects.flash.enabled || this.effects.flash.intensity < 0.01) return;

    ctx.save();
    ctx.fillStyle = this.effects.flash.color;
    ctx.globalAlpha = this.effects.flash.intensity * 0.8;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  renderBorder(ctx, width, height) {
    if (!this.effects.border.enabled) return;

    let borderWidth = this.effects.border.width;

    if (this.effects.border.pulse) {
      borderWidth *= 1 + this.beatIntensity * 0.5;
    }

    ctx.save();
    ctx.strokeStyle = this.effects.border.color;
    ctx.lineWidth = borderWidth;

    if (this.effects.border.glow) {
      ctx.shadowColor = this.effects.border.color;
      ctx.shadowBlur = borderWidth * 2;
    }

    ctx.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      width - borderWidth,
      height - borderWidth
    );
    ctx.restore();
  }

  renderColorOverlay(ctx, width, height) {
    if (!this.effects.colorOverlay.enabled) return;

    ctx.save();
    ctx.globalCompositeOperation = this.effects.colorOverlay.blendMode;
    ctx.fillStyle = this.effects.colorOverlay.color;
    ctx.globalAlpha = this.effects.colorOverlay.opacity;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  renderVignette(ctx, width, height) {
    if (!this.effects.vignette.enabled) return;

    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );

    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, 'transparent');
    gradient.addColorStop(1, this.effects.vignette.color);

    ctx.save();
    ctx.globalAlpha = this.effects.vignette.intensity;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  renderScanlines(ctx, width, height) {
    if (!this.effects.scanlines.enabled) return;

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = this.effects.scanlines.opacity;

    const spacing = this.effects.scanlines.spacing;
    for (let y = 0; y < height; y += spacing) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  // Settings getters/setters
  setEffect(effectName, settings) {
    if (this.effects[effectName]) {
      Object.assign(this.effects[effectName], settings);
    }
  }

  getEffect(effectName) {
    return this.effects[effectName];
  }

  toggleEffect(effectName, enabled) {
    if (this.effects[effectName]) {
      this.effects[effectName].enabled = enabled;
    }
  }

  // Export settings
  exportSettings() {
    return {
      logo: { ...this.logo, image: null },
      effects: JSON.parse(JSON.stringify(this.effects))
    };
  }

  importSettings(settings) {
    if (settings.logo) {
      Object.assign(this.logo, settings.logo);
    }
    if (settings.effects) {
      Object.assign(this.effects, settings.effects);
    }
  }
}
