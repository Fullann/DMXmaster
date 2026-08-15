import express from 'express'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { join } from 'path'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import type { SceneManager } from './sceneManager'
import type { FixtureManager } from './fixtureManager'

export class WebServerManager {
  private app = express()
  private server: http.Server
  private wss: WebSocketServer
  private sceneManager: SceneManager | null = null
  private fixtureManager: FixtureManager | null = null
  private port: number = 8080

  /** Simple bearer token generated per session — printed to console on startup */
  private authToken: string = randomUUID()

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
      console.log(`[WebServerManager] Auth Token: ${this.authToken}`)
    })
  }

  public stop() {
    this.wss.close()
    this.server.close()
    console.log('[WebServerManager] Stopped.')
  }

  /** Returns the current auth token (for displaying in UI) */
  public getAuthToken(): string {
    return this.authToken
  }

  private setupRoutes() {
    // Serve static files from the companion public directory
    const publicDir = app.isPackaged 
      ? join(process.resourcesPath, 'app.asar/src/companion/public')
      : join(__dirname, '../../src/companion/public')
      
    this.app.use(express.static(publicDir))

    // ── Auth middleware for API routes ─────────────────────────────────────────
    this.app.use('/api', (req, res, next) => {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token
      if (token !== this.authToken) {
        return res.status(401).json({ error: 'Unauthorized. Provide a valid Bearer token.' })
      }
      next()
    })

    this.app.get('/api/scenes', (req, res) => {
      if (!this.sceneManager) {
        return res.status(500).json({ error: 'Scene manager not initialized' })
      }
      res.json({ scenes: this.sceneManager.getScenes() })
    })
  }

  private setupWebSockets() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      // ── WebSocket Auth: require ?token=xxx in the upgrade URL ──────────────
      const url = new URL(req.url || '', `http://localhost:${this.port}`)
      const token = url.searchParams.get('token')
      if (token !== this.authToken) {
        console.warn('[WebServerManager] Rejected WebSocket: invalid token')
        ws.close(4001, 'Unauthorized')
        return
      }

      console.log('[WebServerManager] Companion connected via WebSocket (authenticated)')

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString())
          
          // Validate message structure
          if (!data || typeof data.type !== 'string') {
            console.warn('[WebServerManager] Invalid message format')
            return
          }

          if (data.type === 'triggerScene' && typeof data.payload === 'string') {
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
