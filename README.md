# Sprite Sheet Editor

A modern web-based sprite sheet packer designed specifically for **PixiJS** game development. Create optimized texture atlases from individual sprite images with customizable packing options and real-time preview.

Try it now: [Sprite Sheet Editor](https://rickeyward.github.io/sprite-sheet-editor/)

## 🤖 AI-Assisted Development Experiment

**This entire project was built using only AI prompting** through Cursor IDE with Claude Sonnet 4.0. No traditional coding was performed - every line of code, styling, and feature was generated through conversational AI assistance. This represents an experiment to understand the current state of AI-assisted development and explore what's possible when achieving real-world goals through pure AI collaboration.

The development process involved:
- Iterative feature requests through natural language
- Real-time problem-solving and debugging via AI conversation  
- UI/UX refinements through descriptive feedback
- Code architecture decisions guided by AI recommendations

This project serves as both a functional tool and a case study in AI-driven software development.

## ✨ Features

### Core Functionality
- **Drag & Drop Interface** - Import sprites by dragging files or folders
- **Real-time Preview** - See your sprite sheet as you build it
- **Flexible Packing Options** - Multiple algorithms and customization settings
- **Animation Support** - Create and preview sprite animations
- **Multiple Export Formats** - JSON metadata compatible with PixiJS

### Packing Options
- **Sprite Dimensions** - Keep original size or trim transparent pixels
- **Spacing & Padding** - Adjustable gaps between sprites
- **Power-of-2 Sizing** - Optional texture-friendly dimensions (512, 1024, 2048, etc.)
- **Rotation Support** - Experimental 90° rotation for better packing
- **Quick Presets** - Preserve, Tight, Standard, and Loose packing modes

### Advanced Features
- **Sprite Strip Slicer** - Convert sprite strips into individual frames
- **Animation Manager** - Group sprites into animated sequences
- **Batch Operations** - Select and manage multiple sprites
- **Zoom & Pan** - Detailed sprite sheet inspection
- **Export Control** - Customizable output options

## 🎮 Perfect for PixiJS

This tool generates sprite sheets optimized for PixiJS workflows:
- Compatible JSON texture atlas format
- Efficient packing algorithms reduce texture memory
- Animation frame data for sprite sequences
- Power-of-2 textures for optimal GPU performance

## 🚀 Getting Started

### Online Version
Visit the live demo: [Sprite Sheet Editor](https://rickeyward.github.io/sprite-sheet-editor/)

### Local Development
```bash
# Clone the repository
git clone https://github.com/RickeyWard/sprite-sheet-editor.git

# Navigate to project directory
cd sprite-sheet-editor

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production
```bash
# Build the project
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## 📝 Usage

1. **Import Sprites** - Drag image files into the upload area
2. **Configure Packing** - Choose your preferred settings:
   - Select sprite dimension handling (original vs trimmed)
   - Adjust spacing and padding
   - Enable power-of-2 dimensions if needed
3. **Create Animations** (optional) - Group related sprites into sequences
4. **Preview** - Use zoom and pan to inspect your sprite sheet
5. **Export** - Download the packed sprite sheet and JSON metadata

## 🛠 Technology Stack

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tooling
- **Canvas API** - Image processing and rendering
- **React Dropzone** - File upload handling
- **CSS3** - Modern styling with flexbox/grid

## 📊 Packing Algorithms

The editor implements efficient bin-packing algorithms to minimize texture size while maximizing sprite density. Multiple strategies ensure optimal results for different sprite collections.

## 🎯 Use Cases

- **Game Development** - Create texture atlases for PixiJS games
- **Animation Production** - Pack sprite sequences efficiently
- **Asset Optimization** - Reduce texture memory usage
- **Prototyping** - Quickly test sprite arrangements

## 🤝 Contributing

While this project was built through AI assistance, contributions are welcome! Please feel free to:
- Report issues or bugs
- Suggest new features
- Submit pull requests
- Share feedback on the AI development approach

## 📄 License

MIT License - feel free to use this project for any purpose.

---

*Built with AI assistance through Cursor IDE + Claude Sonnet 4.0*
