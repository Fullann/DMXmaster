import '@testing-library/jest-dom'
import { vi } from 'vitest'

if (typeof window !== 'undefined') {
  // Mock de l'API Electron exposée via contextBridge
  window.dmxAPI = {
    listPorts: vi.fn().mockResolvedValue({ success: true, ports: [] }),
    connect: vi.fn().mockResolvedValue({ success: true }),
    disconnect: vi.fn().mockResolvedValue({ success: true }),
    updateChannel: vi.fn().mockResolvedValue({ success: true }),
    updateChannels: vi.fn().mockResolvedValue({ success: true }),
    blackout: vi.fn().mockResolvedValue({ success: true }),
    onUniverseUpdate: vi.fn().mockReturnValue(() => {}),
    softBlackout: vi.fn()
  }

  // Mock des autres APIs pour que les stores puissent s'initialiser sans crasher
  window.fixtureAPI = {
    getProfiles: vi.fn().mockResolvedValue({ success: true, profiles: [] }),
    getPatch: vi.fn().mockResolvedValue({ success: true, patch: [] }),
    getStates: vi.fn().mockResolvedValue({ success: true, states: {} }),
    clearAll: vi.fn().mockResolvedValue({ success: true })
  }

  window.sceneAPI = {
    getScenes: vi.fn().mockResolvedValue({ success: true, scenes: [] })
  }

  window.chaserAPI = {
    getStatus: vi.fn().mockResolvedValue({ success: true, status: {} }),
    getChasers: vi.fn().mockResolvedValue({ success: true, chasers: [] })
  }

  window.fxAPI = {
    getEffects: vi.fn().mockResolvedValue({ success: true, effects: [] })
  }

  window.gridAPI = {
    getPages: vi.fn().mockResolvedValue({ success: true, pages: [] })
  }

  window.networkAPI = {
    getConfig: vi.fn().mockResolvedValue({ success: true, config: { nodes: [], broadcastEnabled: true } })
  }
}
