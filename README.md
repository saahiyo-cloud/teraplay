# TeraPlay

TeraPlay is a sleek, modern, and high-performance web-based video player custom-built for streaming and downloading videos resolved from TeraBox links. It integrates seamlessly with the **TeraBridge API** to provide dynamic, high-speed HLS (HTTP Live Streaming) and direct download link fallbacks.

## 🚀 Features

- **⚡ HLS (HTTP Live Streaming) Integration**: Automatically utilizes HLS streaming with seamless resolution switching when available.
- **🔗 Direct Link Fallback**: Automatically falls back to high-speed direct download link streams if HLS transcoding is in progress or unavailable.
- **📥 Direct Downloads**: One-click native browser download of resolved media.
- **🧠 Remember Playback Progress**: Saves and resumes your playback position automatically using local storage.
- **⏭️ Smart Autoplay**: Automatically queues and plays the next available file in a directory/list when the current video ends.
- **🎨 Modern Dark UI**: Premium design built with vibrant accents, responsive side panels, blur backdrops, and interactive controls.
- **⚡ Performance Indicators**: Visual real-time ping latency check to the TeraBridge API server.
- **⌨️ Keyboard Shortcuts**: Fully supported desktop controls (Space for play/pause, Arrows for seeking, `F` for fullscreen, `?` for shortcuts help overlay).
- **💖 Favorites & Sharing**: Mark files as favorites and easily copy direct links to your clipboard.

## 🛠️ Tech Stack

- **Frontend Framework**: [React](https://react.dev/) + [Vite](https://vite.dev/)
- **Styling**: [TailwindCSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Streaming Logic**: [HLS.js](https://github.com/video-dev/hls.js/)
- **Routing**: [React Router v7](https://reactrouter.com/)

## ⚙️ Configuration & Environment

Configuration parameters are loaded from Vite environment variables (prefixed with `VITE_`). Create a `.env` file in the root directory:

```env
# Base URL for the TeraBridge API server
VITE_API_BASE=https://terabridge.onrender.com

# API Authorization key
VITE_API_KEY=your_apiserver_secret_key
```

## 💻 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/saahiyo-cloud/teraplay.git
cd teraplay
npm install
```

### 2. Run Locally in Development Mode
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

Built with ❤️ by [saahiyo-cloud](https://github.com/saahiyo-cloud).
