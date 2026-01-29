# MilkDrop Web Visualizer

A fully functional, browser-based music visualizer compatible with MilkDrop presets. Built on top of [Butterchurn](https://github.com/jberg/butterchurn), an open-source WebGL implementation of the MilkDrop visualizer.

## Features

- **MilkDrop Preset Compatibility**: Renders MilkDrop presets using WebGL 2
- **Multiple Audio Sources**:
  - Microphone input
  - System audio capture (via screen/tab sharing)
  - **PipeWire/Linux Monitor Device Support**
  - Audio file playback
- **Preset Management**:
  - 100+ built-in presets from butterchurn-presets
  - Load custom .milk preset files
  - Auto-cycle with configurable interval
  - Random preset selection
- **Controls**:
  - Sensitivity adjustment
  - Blend time configuration
  - Fullscreen mode
  - Keyboard shortcuts

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `R` | Random preset |
| `←` | Previous preset |
| `→` | Next preset |
| `F` | Toggle fullscreen |
| `H` | Toggle controls panel |
| `M` | Connect microphone |
| `S` | Connect system audio |
| `D` | Refresh device list |
| `Esc` | Exit fullscreen |

## Audio Sources

### Microphone
Click the microphone button or press `M` to capture audio from your microphone.

### System Audio (Screen Share)
Click the system audio button or press `S` to capture audio from your computer. This uses the Screen Capture API - you'll need to:
1. Select a window, tab, or screen to share
2. **Important**: Check the "Share audio" checkbox in the browser dialog

### PipeWire/Linux - Device Selector (Recommended for Linux)

On Linux with PipeWire, you can capture system audio directly using Monitor devices:

1. **Click the Refresh button (🔄)** in the Device Selector section
2. **Grant microphone permission** when the browser prompts
3. **Look for "Monitor" devices** in the dropdown - these capture system audio output
   - Example: "Monitor of Built-in Audio Analog Stereo"
   - Monitor devices are marked with ★ and highlighted in green
4. **Select the Monitor device** and click "Connect Selected Device"

**Why this works better on Linux:**
- PipeWire exposes audio output as "Monitor" input devices
- This allows direct capture of system audio without screen sharing
- Works with any audio playing on your system (Spotify, YouTube, games, etc.)

**If no Monitor devices appear:**
- Make sure PipeWire is running: `systemctl --user status pipewire`
- Check that audio is playing through the device you want to monitor
- Try running: `pactl list sources short` to see available sources

### Audio File
Click the audio file button to load and play an audio file (MP3, WAV, OGG, etc.)

## Loading Custom Presets

You can load custom MilkDrop .milk preset files:
1. Click "Load .milk File" in the Custom Preset section
2. Select your .milk file
3. The preset will be loaded and added to the preset list

## Technical Details

- **Rendering Engine**: Butterchurn (WebGL 2 implementation of MilkDrop)
- **Audio Analysis**: Web Audio API with AnalyserNode
- **Build Tool**: Vite
- **Browser Requirements**: WebGL 2 support (Chrome 56+, Firefox 51+, Safari 15+, Edge 79+)

## System Audio Capture Comparison

| Method | Platform | Pros | Cons |
|--------|----------|------|------|
| Device Selector (Monitor) | Linux (PipeWire) | Direct system audio, no screen share needed | Linux only |
| Screen Share Audio | All platforms | Cross-platform | Requires sharing screen/tab |
| Virtual Audio Cable | All platforms | Works everywhere | Requires extra software setup |

## Troubleshooting

### No audio visualization
1. Make sure an audio source is connected (check the status message)
2. Ensure audio is actually playing
3. Try increasing the Sensitivity slider

### No Monitor devices on Linux
1. Ensure PipeWire is installed and running
2. Check your audio output device is active
3. Some systems may need `pipewire-pulse` for compatibility

### Visualizer not rendering
1. Check browser console for WebGL errors
2. Ensure your browser supports WebGL 2
3. Try disabling hardware acceleration and re-enabling it

## License

MIT License - see [LICENSE](LICENSE)

## Credits

- [Butterchurn](https://github.com/jberg/butterchurn) - WebGL MilkDrop visualizer
- [Butterchurn Presets](https://github.com/jberg/butterchurn-presets) - Preset collection
- [MilkDrop](https://www.geisswerks.com/milkdrop/) - Original visualizer by Ryan Geiss
