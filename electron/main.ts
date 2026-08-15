import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { DmxEngine }      from './dmxEngine'
import { SerialManager }  from './serialManager'
import { FixtureManager } from './fixtureManager'
import { SceneManager }   from './sceneManager'
import { ChaserManager }  from './chaserManager'
import { EffectsEngine }  from './effectsEngine'
import { LiveGridManager } from './liveGridManager'
import { AudioEngine }    from './audioEngine'
import { NetworkManager } from './networkManager'
import { PixelEngine }    from './pixelEngine'
import { TimelineManager} from './timelineManager'
import { ShowManager }    from './showManager'
import { PaletteManager } from './paletteManager'
import { WebServerManager } from './webServerManager'
import { VirtualConsoleManager } from './virtualConsoleManager'
import { CuelistManager } from './cuelistManager'
import { RdmManager } from './rdmManager'
import { registerIpcHandlers, pushUniverseUpdate } from './ipc/index'

// ── Core services (singletons for app lifetime) ───────────────────────────────
const serialManager  = new SerialManager()
const dmxEngine      = new DmxEngine(serialManager)
const fixtureManager = new FixtureManager()
const effectsEngine  = new EffectsEngine()
const paletteManager = new PaletteManager()
const sceneManager   = new SceneManager(fixtureManager, effectsEngine, paletteManager)
const chaserManager  = new ChaserManager(sceneManager)
const liveGridManager= new LiveGridManager()
const audioEngine    = new AudioEngine()
const networkManager = new NetworkManager()
const pixelEngine    = new PixelEngine()
const timelineManager= new TimelineManager()
const showManager    = new ShowManager()
const webServerManager = new WebServerManager()
const virtualConsoleManager = new VirtualConsoleManager()
const cuelistManager = new CuelistManager(sceneManager)
const rdmManager     = new RdmManager(serialManager)

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width:           1400,
    height:          860,
    minWidth:        960,
    minHeight:       640,
    backgroundColor: '#080810',
    titleBarStyle:   'hiddenInset',
    show:            false,
    webPreferences: {
      preload:          join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          true,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // ── Content Security Policy ───────────────────────────────────────────────
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isDev = process.env['ELECTRON_RENDERER_URL'] !== undefined
    const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'"
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' http://localhost:*; " +
          `script-src ${scriptSrc}; ` +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          "img-src 'self' data: blob: http://localhost:*; " +
          "media-src 'self' blob:; " +
          "connect-src 'self' ws://localhost:* http://localhost:*;"
        ]
      }
    })
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (process.env.NODE_ENV === 'development' || process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.webContents.openDevTools({ mode: 'bottom' })
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return mainWindow
}

let visualizerWindow: BrowserWindow | null = null

function createVisualizerWindow() {
  if (visualizerWindow && !visualizerWindow.isDestroyed()) {
    visualizerWindow.focus()
    return
  }

  visualizerWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: '#050505',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    visualizerWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + '#visualizer')
  } else {
    visualizerWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'visualizer' })
  }

  visualizerWindow.once('ready-to-show', () => {
    visualizerWindow?.show()
  })
}

ipcMain.handle('app:openVisualizer', () => {
  createVisualizerWindow()
})

app.whenReady().then(async () => {
  // 0. Initialize show manager and check for crash recovery FIRST
  showManager.initialize()
  await showManager.checkCrashRecovery()

  // 1. FixtureManager — creates dirs, loads profiles from disk
  await fixtureManager.initialize()

  // 2. SceneManager, ChaserManager, GridManager, NetworkManager, PixelEngine load from disk
  await sceneManager.initialize()
  await chaserManager.initialize()
  await liveGridManager.initialize()
  await networkManager.initialize()
  await pixelEngine.initialize()
  await timelineManager.initialize()
  await paletteManager.initialize()
  virtualConsoleManager.init()
  cuelistManager.init()

  // Initialize WebServerManager
  webServerManager.initialize(sceneManager, fixtureManager)

  // 3. Wire fixture, scene, effects, and chaser managers into the 44Hz engine
  dmxEngine.setFixtureManager(fixtureManager)
  dmxEngine.setSceneManager(sceneManager)
  dmxEngine.setChaserManager(chaserManager)
  dmxEngine.setEffectsEngine(effectsEngine)
  dmxEngine.setAudioEngine(audioEngine)
  dmxEngine.setNetworkManager(networkManager)
  dmxEngine.setPixelEngine(pixelEngine)

  // 4. Register all IPC handlers
  registerIpcHandlers(dmxEngine, serialManager, fixtureManager, sceneManager, chaserManager, effectsEngine, liveGridManager, audioEngine, networkManager, pixelEngine, timelineManager, showManager, paletteManager, virtualConsoleManager, cuelistManager, rdmManager)

  // 5. Create window + start engine & web server
  const mainWindow = createWindow()
  // Wire window reference so NetworkManager can push DMX-IN events without dynamic require()
  networkManager.setBrowserWindow(mainWindow)
  await dmxEngine.loadProgrammerState()
  dmxEngine.start()
  webServerManager.start()
  
  // Start auto-save every 5 minutes (300,000 ms)
  showManager.startAutoSave(5 * 60 * 1000, dmxEngine)
  
  console.log('[Main] DMX engine started.')

  // 6. Push universe updates to renderer at ~30fps for the 3D Visualizer & DMX Monitor
  const PUSH_INTERVAL_MS = Math.round(1000 / 30)
  const pushTimer = setInterval(() => {
    const snap = dmxEngine.getUniverseSnapshot()
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents) {
        pushUniverseUpdate(win.webContents, snap)
      }
    }
  }, PUSH_INTERVAL_MS)
  pushTimer.unref()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', async () => {
  console.log('[Main] Shutting down…')
  showManager.shutdown()
  webServerManager.stop()
  dmxEngine.stop()
  await serialManager.disconnect()
  console.log('[Main] Clean shutdown complete.')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
