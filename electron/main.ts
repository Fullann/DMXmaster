import { app, BrowserWindow, shell } from 'electron'
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
import { registerIpcHandlers, pushUniverseUpdate } from './ipc/index'

// ── Core services (singletons for app lifetime) ───────────────────────────────
const serialManager  = new SerialManager()
const dmxEngine      = new DmxEngine(serialManager)
const fixtureManager = new FixtureManager()
const sceneManager   = new SceneManager(fixtureManager)
const chaserManager  = new ChaserManager(sceneManager)
const effectsEngine  = new EffectsEngine()
const liveGridManager= new LiveGridManager()
const audioEngine    = new AudioEngine()
const networkManager = new NetworkManager()
const pixelEngine    = new PixelEngine()
const timelineManager= new TimelineManager()
const showManager    = new ShowManager()

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
      sandbox:          false,
    },
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

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

app.whenReady().then(async () => {
  // 1. FixtureManager — creates dirs, loads profiles from disk
  await fixtureManager.initialize()

  // 2. SceneManager, ChaserManager, GridManager, NetworkManager, PixelEngine load from disk
  await sceneManager.initialize()
  await chaserManager.initialize()
  await liveGridManager.initialize()
  await networkManager.initialize()
  await pixelEngine.initialize()
  await timelineManager.initialize()
  showManager.initialize()

  // 3. Wire fixture, scene, effects, and chaser managers into the 44Hz engine
  dmxEngine.setFixtureManager(fixtureManager)
  dmxEngine.setSceneManager(sceneManager)
  dmxEngine.setChaserManager(chaserManager)
  dmxEngine.setEffectsEngine(effectsEngine)
  dmxEngine.setAudioEngine(audioEngine)
  dmxEngine.setNetworkManager(networkManager)
  dmxEngine.setPixelEngine(pixelEngine)

  // 4. Register all IPC handlers
  registerIpcHandlers(dmxEngine, serialManager, fixtureManager, sceneManager, chaserManager, effectsEngine, liveGridManager, audioEngine, networkManager, pixelEngine, timelineManager, showManager)

  // 5. Create window + start engine
  const mainWindow = createWindow()
  dmxEngine.start()
  console.log('[Main] DMX engine started.')

  // 6. Push universe updates to renderer at ~30fps for the 3D Visualizer & DMX Monitor
  //    We use a separate slower interval from the 44Hz engine to avoid flooding IPC.
  const PUSH_INTERVAL_MS = Math.round(1000 / 30)
  const pushTimer = setInterval(() => {
    if (!mainWindow.isDestroyed() && mainWindow.webContents) {
      pushUniverseUpdate(mainWindow.webContents, dmxEngine.getUniverseSnapshot())
    }
  }, PUSH_INTERVAL_MS)
  pushTimer.unref()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', async () => {
  console.log('[Main] Shutting down…')
  dmxEngine.stop()
  await serialManager.disconnect()
  console.log('[Main] Clean shutdown complete.')
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
