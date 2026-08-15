import { app, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import * as dgram from 'dgram'
import * as os from 'os'
import type { NetworkConfig, NetworkNode } from './networkTypes'
import { MAX_UNIVERSES } from './networkTypes'

export class NetworkManager {
  private configPath = ''
  private config: NetworkConfig = { nodes: [], broadcastEnabled: true }
  
  // Single reusable UDP socket for Art-Net
  private socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  // Single reusable UDP socket for sACN
  private sacnSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  
  // Pre-allocated Art-Net packet buffer (18 byte header + 512 byte data)
  private packetBuffer = Buffer.alloc(530)
  
  // DMX-IN variables
  private localIps: Set<string> = new Set()
  private incomingUniverses: Uint8Array[] = Array.from(
    { length: MAX_UNIVERSES },
    () => new Uint8Array(512)
  )
  
  // Timeout references to clear incoming universes if source drops
  private incomingTimeouts: (NodeJS.Timeout | null)[] = Array(MAX_UNIVERSES).fill(null)
  // Reference to the main BrowserWindow for IPC push events (DMX-IN)
  private mainWindow: BrowserWindow | null = null

  /** Called once the main window is created to enable DMX-IN IPC push. */
  setBrowserWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  constructor() {
    this._initPacketHeader()
    
    // Get local IPs to ignore loopback (prevent merging our own broadcasts)
    const interfaces = os.networkInterfaces()
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        this.localIps.add(iface.address)
      }
    }
    this.localIps.add('127.0.0.1')
    
    // Listen for incoming Art-Net packets
    this.socket.on('message', (msg, rinfo) => this._handleArtNet(msg, rinfo))
    
    // Bind to standard Art-Net port 6454 locally to *receive* Art-Net.
    this.socket.bind(6454, '0.0.0.0', () => {
      this.socket.setBroadcast(true) 
    })

    // Listen for incoming sACN packets
    this.sacnSocket.on('message', (msg, rinfo) => this._handleSacn(msg, rinfo))
    
    // Bind to standard sACN port 5568 locally to *receive* sACN.
    this.sacnSocket.bind(5568, '0.0.0.0', () => {
      // Join multicast groups for the first MAX_UNIVERSES
      for (let u = 1; u <= MAX_UNIVERSES; u++) {
        try {
          this.sacnSocket.addMembership(`239.255.${u >> 8}.${u & 0xFF}`)
        } catch (e) {
          // Ignore membership errors (e.g., no default interface)
        }
      }
    })
  }

  private _handleArtNet(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    if (this.localIps.has(rinfo.address)) return // Ignore loopback

    // ArtDmx parsing (min length 18)
    if (msg.length < 18) return
    if (msg.toString('ascii', 0, 8) !== 'Art-Net\0') return

    const opCode = msg.readUInt16LE(8)
    if (opCode === 0x5000) { // ArtDmx
      const portAddress = msg.readUInt16LE(14)
      const universe = portAddress & 0x0F // Subnet/Universe mapping. Simplify to low 4 bits for MAX_UNIVERSES
      if (universe >= 0 && universe < MAX_UNIVERSES) {
        const length = msg.readUInt16BE(16)
        const dmxData = msg.subarray(18, 18 + length)
        this._updateIncoming(universe, dmxData)
      }
    }
  }

  private _handleSacn(msg: Buffer, rinfo: dgram.RemoteInfo): void {
    if (this.localIps.has(rinfo.address)) return // Ignore loopback

    // sACN parsing (min length 126 for data)
    if (msg.length < 126) return
    if (msg.toString('ascii', 4, 16) !== 'ASC-E1.17\0\0\0') return

    // Universe is at offset 113 (Big Endian)
    const universe = msg.readUInt16BE(113) - 1 // sACN universes start at 1, map to 0-indexed
    
    if (universe >= 0 && universe < MAX_UNIVERSES) {
      // DMX values start at offset 126 (after the 1-byte START code at 125)
      const length = msg.readUInt16BE(123)
      const dmxLength = Math.min(length - 1, 512) // Subtract START code
      const dmxData = msg.subarray(126, 126 + dmxLength)
      this._updateIncoming(universe, dmxData)
    }
  }

  private _updateIncoming(universe: number, dmxData: Buffer): void {
    const oldData = this.incomingUniverses[universe]
    const isRemote = this.config.inputRouting?.[universe] === 'remote'
    
    if (isRemote) {
      // For remote control, emit IPC events for changed channels
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        for (let i = 0; i < dmxData.length; i++) {
          if (dmxData[i] !== oldData[i]) {
            this.mainWindow.webContents.send('dmxIn:change', { universe, channel: i, value: dmxData[i] })
          }
        }
      }
    }
    
    this.incomingUniverses[universe].set(dmxData)
    
    // Reset timeout for this universe
    if (this.incomingTimeouts[universe]) {
      clearTimeout(this.incomingTimeouts[universe]!)
    }
    this.incomingTimeouts[universe] = setTimeout(() => {
      this.incomingUniverses[universe].fill(0)
      this.incomingTimeouts[universe] = null
      console.log(`[NetworkManager] Cleared incoming DMX for universe ${universe} due to timeout`)
    }, 2000)
  }

  getIncomingUniverses(): Uint8Array[] {
    return this.incomingUniverses
  }

  async initialize(): Promise<void> {
    const docPath = app.getPath('documents')
    const appDir  = join(docPath, 'DmxMaster')
    this.configPath = join(appDir, 'NetworkConfig.json')

    try {
      await fs.mkdir(appDir, { recursive: true })
      const data = await fs.readFile(this.configPath, 'utf8')
      const parsed = JSON.parse(data)
      this.config = {
        nodes: parsed.nodes || [],
        broadcastEnabled: parsed.broadcastEnabled ?? true,
        inputRouting: parsed.inputRouting ?? {}
      }
      console.log(`[NetworkManager] Loaded ${this.config.nodes.length} nodes from disk.`)
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        console.error('[NetworkManager] Error loading config:', e.message)
      }
      // Save default
      this.config.inputRouting = {}
      await this.saveConfig(this.config)
    }
  }

  getConfig(): NetworkConfig {
    return this.config
  }

  async saveConfig(cfg: NetworkConfig): Promise<void> {
    this.config = cfg
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8')
    console.log('[NetworkManager] Saved NetworkConfig.')
  }

  // ── Art-Net Builder ─────────────────────────────────────────────────────────

  /**
   * Initializes the static parts of the Art-Net ArtDmx header.
   */
  private _initPacketHeader(): void {
    // 0-7: "Art-Net\0"
    this.packetBuffer.write('Art-Net\0', 0, 8, 'ascii')
    // 8-9: OpCode ArtDmx (0x5000, Little Endian)
    this.packetBuffer.writeUInt16LE(0x5000, 8)
    // 10-11: Protocol Version (14, Big Endian)
    this.packetBuffer.writeUInt16BE(14, 10)
    // 12: Sequence (0, disable sequence checking)
    this.packetBuffer.writeUInt8(0, 12)
    // 13: Physical Port (0)
    this.packetBuffer.writeUInt8(0, 13)
    // 14-15: Universe will be written dynamically per node
    // 16-17: Length (512, Big Endian)
    this.packetBuffer.writeUInt16BE(512, 16)
  }

  // ── Broadcasting ────────────────────────────────────────────────────────────

  /**
   * Broadcasts the given 512-byte universe arrays to all active Network Nodes.
   * Called automatically by DmxEngine at 44Hz.
   */
  broadcastAll(universes: Uint8Array[]): void {
    if (!this.config.broadcastEnabled || this.config.nodes.length === 0) return

    for (const node of this.config.nodes) {
      if (!node.active || node.protocol !== 'ArtNet') continue

      // Only send if the node's targetUniverse is within our engine bounds
      const uIdx = node.targetUniverse
      if (uIdx < 0 || uIdx >= universes.length) continue

      const targetUniverseData = universes[uIdx]

      // Copy universe data directly into the packet buffer payload section
      this.packetBuffer.set(targetUniverseData, 18)

      // Calculate 15-bit Art-Net port address
      // Bit 15: 0
      // Bits 8-14: Net (0-127)
      // Bits 4-7: Subnet (0-15)
      // Bits 0-3: Universe (0-15)
      const net = node.net || 0
      const subnet = node.subnet || 0
      const portAddress = ((net & 0x7F) << 8) | ((subnet & 0x0F) << 4) | (node.targetUniverse & 0x0F)

      // Write Port-Address into Bytes 14-15 (Little Endian)
      this.packetBuffer.writeUInt16LE(portAddress, 14)

      // Fire and forget over UDP (Port 6454)
      this.socket.send(this.packetBuffer, 0, 530, 6454, node.ipAddress)
    }
  }
}
