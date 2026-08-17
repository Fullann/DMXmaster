# DMX Master 🚀

**DMX Master** is a modern, cross-platform lighting control software built with Electron, React, and TypeScript. It is designed to provide professional-grade DMX lighting control for live shows, architectural lighting, and DJ sets with a highly intuitive user interface.

![DMX Master](https://img.shields.io/badge/Status-v1.0.0-success?style=flat-square)
![Electron](https://img.shields.io/badge/Electron-App-blue?style=flat-square&logo=electron)
![React](https://img.shields.io/badge/React-UI-61dafb?style=flat-square&logo=react)

---

## 📖 Documentation & Manual

If you want to learn how to use DMX Master, please refer to the official User Manual:
👉 **[Manuel d'Utilisation (Français)](docs/USER_MANUAL.md)**

---

## ✨ Features

- **Intuitive Patch & Library System**: Easily patch fixtures or create your own fixture profiles.
- **AI Profile Generator**: Just paste your lighting fixture's manual, and the AI will generate the channel mapping for you.
- **3D Visualizer**: Real-time volumetric light beams and gobo rendering without crashing your GPU.
- **Live Virtual Console**: A full drag-and-drop interface. Create your own workspace with buttons, faders, XY Pads, and Color Pickers.
- **Network & Art-Net**: Send DMX data over the network to any compatible node or WLED controller.
- **Scenes & Chasers**: Create static looks and dynamic chases with tap-tempo support.
- **Global Show Export (`.dmxshow`)**: Easily bundle your entire project, including patches and profiles, into a single file to transfer between computers. *(Coming soon)*

---

## 🛠️ Development Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Fullann/DMXmaster.git
   cd DMXmaster
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

### Build for Production

To package the application for your operating system (v1 release):
```bash
npm run build
```
This will compile the TypeScript, Vite assets, and Electron main process into an executable in the `dist` or `out` directory depending on your configuration.

---

## 👨‍💻 Credits

Developed with ❤️ by **[Fullann](https://github.com/Fullann)**.

---
*DMX Master - Illuminate your stage.*