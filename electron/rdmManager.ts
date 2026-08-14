import type { SerialManager } from './serialManager'
import type { RdmDevice } from '../src/types/rdm'
import { randomUUID } from 'crypto'

export class RdmManager {
  private serial: SerialManager
  private isDiscovering = false
  private devices: RdmDevice[] = []
  
  private updateCallback: ((status: { isDiscovering: boolean, devices: RdmDevice[] }) => void) | null = null

  constructor(serial: SerialManager) {
    this.serial = serial
  }

  public setUpdateCallback(cb: (status: { isDiscovering: boolean, devices: RdmDevice[] }) => void) {
    this.updateCallback = cb
  }

  private notify() {
    if (this.updateCallback) {
      this.updateCallback({
        isDiscovering: this.isDiscovering,
        devices: this.devices
      })
    }
  }

  /**
   * Lance la procédure de découverte RDM (Mute / TOD Request).
   * Note : L'implémentation binaire ANSI E1.20 exacte est très complexe.
   * Cette méthode MVP simule la découverte pour le prototype de l'interface,
   * puis retournera des périphériques factices ou parsés depuis un buffer simulé.
   */
  public async discoverDevices(): Promise<void> {
    if (this.isDiscovering) return
    this.isDiscovering = true
    this.devices = []
    this.notify()

    // 1. Envoi de la commande de découverte (simulé)
    // Enttec RDM Label = 0x07 (Send RDM Packet)
    const discoveryPacket = Buffer.from([0x7E, 0x07, 0x00, 0x00, /* ... E1.20 payload ... */ 0xE7])
    this.serial.write(discoveryPacket)

    console.log('[RdmManager] Sent RDM Discovery packet...')

    // 2. Attente de la réponse (simulée ici par un timer)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 3. Mock des périphériques trouvés
    const mockDevices: RdmDevice[] = [
      {
        uid: `0x7FFF:${Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase()}`,
        manufacturerId: 0x7FFF,
        deviceId: 0x1234,
        manufacturerLabel: 'Showtec',
        deviceModelDescription: 'Phantom 50 LED Spot',
        dmxStartAddress: 1,
        dmxPersonality: 1,
        personalityCount: 2
      },
      {
        uid: `0x1234:${Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase()}`,
        manufacturerId: 0x1234,
        deviceId: 0x5678,
        manufacturerLabel: 'Chauvet',
        deviceModelDescription: 'ColorDash Par-Hex 12',
        dmxStartAddress: 14,
        dmxPersonality: 2,
        personalityCount: 4
      }
    ]

    this.devices = mockDevices
    this.isDiscovering = false
    this.notify()
    console.log(`[RdmManager] Discovery complete. Found ${this.devices.length} devices.`)
  }

  /**
   * Envoie une commande RDM SET_COMMAND pour changer l'adresse DMX.
   */
  public async setDmxAddress(uid: string, newAddress: number): Promise<boolean> {
    if (newAddress < 1 || newAddress > 512) return false

    console.log(`[RdmManager] Sending RDM SET_ADDRESS ${newAddress} to UID ${uid}`)
    
    // Simuler l'envoi du paquet RDM SET_COMMAND avec PID 0x00F0
    const setAddressPacket = Buffer.from([0x7E, 0x07, /* ... E1.20 payload ... */ 0xE7])
    this.serial.write(setAddressPacket)

    // Attente simulée
    await new Promise(resolve => setTimeout(resolve, 500))

    // Met à jour la mémoire locale si la commande est réussie
    const device = this.devices.find(d => d.uid === uid)
    if (device) {
      device.dmxStartAddress = newAddress
      this.notify()
      return true
    }

    return false
  }

  /**
   * Permet d'injecter des octets bruts lus depuis le port série, 
   * afin de parser les réponses RDM réelles plus tard.
   */
  public handleIncomingData(data: Buffer) {
    // Label 0x05 = Receive DMX/RDM Packet
    if (data[0] === 0x7E && data[1] === 0x05) {
      // TODO: Implémenter le parseur ANSI E1.20
      // Extract Checksum, CC, PID, PDL, PD...
    }
  }

  public getDevices(): RdmDevice[] {
    return this.devices
  }
}
