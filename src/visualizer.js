import butterchurn from 'butterchurn';

export class VisualizerEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.visualizer = null;
    this.blendTime = 1.5;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.audioContext = null;
  }

  async init() {
    // Check WebGL 2 support
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL 2 is not supported in this browser');
    }

    // Create a placeholder audio context for initialization
    // Real audio will be connected later via connectAudio()
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // Create Butterchurn visualizer
    // Butterchurn takes AudioContext as first param, not GL context
    this.visualizer = butterchurn.createVisualizer(this.audioContext, this.canvas, {
      width: this.width,
      height: this.height,
      pixelRatio: window.devicePixelRatio || 1,
      textureRatio: 1
    });
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    if (this.visualizer) {
      this.visualizer.setRendererSize(width, height);
    }
  }

  setBlendTime(seconds) {
    this.blendTime = seconds;
  }

  loadPreset(preset, blendTime = null) {
    if (this.visualizer && preset) {
      const time = blendTime !== null ? blendTime : this.blendTime;
      this.visualizer.loadPreset(preset, time);
    }
  }

  connectAudio(audioNode) {
    if (this.visualizer && audioNode) {
      this.visualizer.connectAudio(audioNode);
    }
  }

  render(audioData) {
    if (!this.visualizer) return;
    // Butterchurn handles audio internally via connectAudio
    // Just call render() each frame
    this.visualizer.render();
  }

  launchSongTitleAnim(title) {
    if (this.visualizer && this.visualizer.launchSongTitleAnim) {
      this.visualizer.launchSongTitleAnim(title);
    }
  }

  getAudioContext() {
    return this.audioContext;
  }
}
