import { SerialPort, PortInfo } from 'serialport'

// ─────────────────────────────────────────────────────────────────────────────
// SerialManager
//
// Manages the lifecycle of a single serial port connection for the Enttec
// DMX USB Pro adapter. Deliberately kept separate from DmxEngine so either
// piece can be replaced or mocked independently.
// ─────────────────────────────────────────────────────────────────────────────

const BAUD_RATE = 57600 // Enttec DMX USB Pro specification

export class SerialManager {
  private port: SerialPort | null = null
  private _isConnected = false

  // ── Public accessors ────────────────────────────────────────────────────────

  get isConnected(): boolean {
    return this._isConnected
  }

  get currentPath(): string | null {
    return this.port?.path ?? null
  }

  // ── Port discovery ──────────────────────────────────────────────────────────

  /**
   * Returns a list of all available serial ports on the host system.
   * Resolves to an array of PortInfo objects (path, manufacturer, serialNumber, …).
   */
  async listPorts(): Promise<PortInfo[]> {
    return SerialPort.list()
  }

  // ── Connection management ───────────────────────────────────────────────────

  /**
   * Opens a serial port at the given path with the standard Enttec baud rate.
   * Rejects if the port is already open or cannot be opened.
   */
  connect(portPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._isConnected) {
        return reject(new Error(`Already connected to ${this.port?.path}`))
      }

      const newPort = new SerialPort(
        { path: portPath, baudRate: BAUD_RATE, autoOpen: false },
      )

      newPort.open((err) => {
        if (err) {
          return reject(new Error(`Failed to open port ${portPath}: ${err.message}`))
        }

        this.port = newPort
        this._isConnected = true

        // Handle unexpected disconnections (USB unplugged, device reset, etc.)
        newPort.on('close', () => {
          console.warn('[SerialManager] Port closed unexpectedly.')
          this._isConnected = false
          this.port = null
        })

        newPort.on('error', (portErr) => {
          console.error('[SerialManager] Port error:', portErr.message)
        })

        console.log(`[SerialManager] Connected to ${portPath} at ${BAUD_RATE} baud.`)
        resolve()
      })
    })
  }

  /**
   * Gracefully closes the current serial port.
   * Resolves immediately if no port is open.
   */
  disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.port || !this._isConnected) {
        this._isConnected = false
        this.port = null
        return resolve()
      }

      this.port.close((err) => {
        if (err) {
          return reject(new Error(`Failed to close port: ${err.message}`))
        }
        console.log('[SerialManager] Disconnected.')
        this._isConnected = false
        this.port = null
        resolve()
      })
    })
  }

  // ── Data transmission ───────────────────────────────────────────────────────

  /**
   * Writes a buffer to the open serial port.
   * Silently drops writes when no port is connected — the DMX loop keeps
   * running internally; it simply has no transport until one is opened.
   */
  write(data: Buffer): void {
    if (!this.port || !this._isConnected) {
      return // No port open — drop the packet silently
    }

    this.port.write(data, (err) => {
      if (err) {
        console.error('[SerialManager] Write error:', err.message)
      }
    })
  }
}
