import express from 'express'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { join } from 'path'
import { app } from 'electron'
import type { SceneManager } from './sceneManager'
import type { FixtureManager } from './fixtureManager'

export class WebServerManager {
  private app = express()
  private server: http.Server
  private wss: WebSocketServer
  private sceneManager: SceneManager | null = null
  private fixtureManager: FixtureManager | null = null
  private port: number = 8080

  constructor() {
    this.server = http.createServer(this.app)
    this.wss = new WebSocketServer({ server: this.server })
    this.setupRoutes()
    this.setupWebSockets()
  }

  public initialize(sceneManager: SceneManager, fixtureManager: FixtureManager) {
    this.sceneManager = sceneManager
    this.fixtureManager = fixtureManager
  }

  public start() {
    this.server.listen(this.port, () => {
      console.log(`[WebServerManager] Companion App running at http://localhost:${this.port}`)
    })
  }

  public stop() {
    this.wss.close()
    this.server.close()
    console.log('[WebServerManager] Stopped.')
  }

  private setupRoutes() {
    // Serve static files from the companion public directory
    const publicDir = app.isPackaged 
      ? join(process.resourcesPath, 'app.asar/src/companion/public')
      : join(__dirname, '../../src/companion/public')
      
    this.app.use(express.static(publicDir))

    this.app.get('/api/scenes', (req, res) => {
      if (!this.sceneManager) {
        return res.status(500).json({ error: 'Scene manager not initialized' })
      }
      res.json({ scenes: this.sceneManager.getScenes() })
    })
  }

  private setupWebSockets() {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[WebServerManager] Companion connected via WebSocket')

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString())
          
          if (data.type === 'triggerScene' && data.payload) {
            console.log(`[WebServerManager] Triggering scene: ${data.payload}`)
            this.sceneManager?.recallScene(data.payload)
          } 
          else if (data.type === 'softBlackout') {
            console.log(`[WebServerManager] Triggering soft blackout`)
            this.fixtureManager?.softBlackout()
          }
        } catch (error) {
          console.error('[WebServerManager] Error parsing WebSocket message', error)
        }
      })
      
      ws.on('close', () => {
        console.log('[WebServerManager] Companion disconnected')
      })
    })
  }
}
