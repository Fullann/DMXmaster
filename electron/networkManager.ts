import { app } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import * as dgram from 'dgram'
import * as os from 'os'
import type { NetworkConfig, NetworkNode } from './networkTypes'
import { MAX_UNIVERSES } from './networkTypes'

export class NetworkManager {
  private configPath = ''
  private config: NetworkConfig = { nodes: [], broadcastEnabled: true }
  
  // Single reusable UDP socket
  private socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  // Pre-allocated Art-Net packet buffer (18 byte header + 512 byte data)
  private packetBuffer = Buffer.alloc(530)
  
  // DMX-IN variables
  private localIps: Set<string> = new Set()
  private incomingUniverses: Uint8Array[] = Array.from(
    { length: MAX_UNIVERSES },
    () => new Uint8Array(512)
  )

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
    this.socket.on('message', (msg, rinfo) => this._handleMessage(msg, rinfo))
    
    // Bind to standard Art-Net port 6454 locally to *receive* Art-Net.
    this.socket.bind(6454, '0.0.0.0', () => {
      this.socket.setBroadcast(true) 
    })
  }

  private _handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo): void {
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
        this.incomingUniverses[universe].set(dmxData)
      }
    }
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
        broadcastEnabled: parsed.broadcastEnabled ?? true
      }
      console.log(`[NetworkManager] Loaded ${this.config.nodes.length} nodes from disk.`)
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        console.error('[NetworkManager] Error loading config:', e.message)
      }
      // Save default
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

      // Copy the corresponding DMX data payload into our UDP packet buffer
      for (let i = 0; i < 512; i++) {
        this.packetBuffer[18 + i] = targetUniverseData[i]
      }

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
