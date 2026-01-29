export class AudioManager {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.audioElement = null;
    this.sensitivity = 1.0;
    this.isConnected = false;
    this.currentStream = null;
    this.onAudioConnected = null;
    this.availableDevices = [];
    this.currentDeviceId = null;
  }

  setAudioContext(audioContext) {
    this.audioContext = audioContext;
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
  }

  async resumeContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Enumerate all available audio input devices
   * On PipeWire/Linux, monitor sources appear as input devices
   */
  async enumerateAudioDevices() {
    try {
      // First request permission to access audio devices
      // This is needed to get device labels
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.warn('Could not get initial audio permission:', e);
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Audio Input ${device.deviceId.slice(0, 8)}`,
          isMonitor: this.isMonitorDevice(device.label),
          isDefault: device.deviceId === 'default'
        }));

      console.log('Available audio devices:', this.availableDevices);
      return this.availableDevices;
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  /**
   * Check if a device is a monitor/loopback device
   * PipeWire monitor sources typically contain "Monitor" in the name
   */
  isMonitorDevice(label) {
    if (!label) return false;
    const lowerLabel = label.toLowerCase();
    return lowerLabel.includes('monitor') ||
           lowerLabel.includes('loopback') ||
           lowerLabel.includes('stereo mix') ||
           lowerLabel.includes('what u hear') ||
           lowerLabel.includes('wave out');
  }

  /**
   * Get monitor devices (system audio sources)
   */
  getMonitorDevices() {
    return this.availableDevices.filter(d => d.isMonitor);
  }

  /**
   * Get regular input devices (microphones)
   */
  getInputDevices() {
    return this.availableDevices.filter(d => !d.isMonitor);
  }

  /**
   * Connect to a specific audio device by ID
   */
  async connectDevice(deviceId) {
    await this.resumeContext();
    this.disconnect();

    const constraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        // PipeWire-specific: request high quality
        sampleRate: 48000,
        channelCount: 2
      }
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      this.isConnected = true;
      this.currentStream = stream;
      this.currentDeviceId = deviceId;

      if (this.onAudioConnected) {
        this.onAudioConnected(this.analyser);
      }

      const device = this.availableDevices.find(d => d.deviceId === deviceId);
      return device ? device.label : 'Audio connected';
    } catch (error) {
      console.error('Failed to connect to device:', error);
      throw error;
    }
  }

  async connectMicrophone() {
    await this.resumeContext();
    this.disconnect();

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    this.isConnected = true;
    this.currentStream = stream;

    if (this.onAudioConnected) {
      this.onAudioConnected(this.analyser);
    }
  }

  /**
   * Try to connect to system audio using various methods
   * 1. First try PipeWire monitor devices
   * 2. Fall back to getDisplayMedia
   */
  async connectSystemAudio() {
    await this.resumeContext();

    // First, try to find a monitor device (PipeWire/PulseAudio)
    await this.enumerateAudioDevices();
    const monitorDevices = this.getMonitorDevices();

    if (monitorDevices.length > 0) {
      // Use the first monitor device found
      console.log('Found monitor device:', monitorDevices[0].label);
      return await this.connectDevice(monitorDevices[0].deviceId);
    }

    // Fall back to getDisplayMedia (screen sharing audio)
    this.disconnect();

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: 1,
          height: 1,
          frameRate: 1
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        stream.getVideoTracks().forEach(track => track.stop());
        throw new Error('No audio track. Check "Share audio" or use Device Selector for PipeWire.');
      }

      stream.getVideoTracks().forEach(track => track.stop());

      const audioStream = new MediaStream(audioTracks);
      this.source = this.audioContext.createMediaStreamSource(audioStream);
      this.source.connect(this.analyser);
      this.isConnected = true;
      this.currentStream = audioStream;

      if (this.onAudioConnected) {
        this.onAudioConnected(this.analyser);
      }

      return 'Screen audio connected';
    } catch (error) {
      throw new Error('System audio failed. Use Device Selector for PipeWire monitor sources.');
    }
  }

  async connectAudioFile(file) {
    await this.resumeContext();
    this.disconnect();

    this.audioElement = document.getElementById('audio-player');
    this.audioElement.src = URL.createObjectURL(file);

    this.source = this.audioContext.createMediaElementSource(this.audioElement);
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioContext.destination);

    this.isConnected = true;

    if (this.onAudioConnected) {
      this.onAudioConnected(this.analyser);
    }

    await this.audioElement.play();
  }

  disconnect() {
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
      this.source = null;
    }

    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
    }

    this.isConnected = false;
    this.currentDeviceId = null;
  }

  setSensitivity(value) {
    this.sensitivity = value;
  }

  getAnalyser() {
    return this.analyser;
  }

  getAudioData() {
    return this.isConnected;
  }
}
