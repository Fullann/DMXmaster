import { create } from 'zustand'
import type { PortInfo } from '@/types/electron'

export interface SerialState {
  ports: PortInfo[]
  selectedPort: string
  isConnected: boolean
  isLoading: boolean
  error: string | null

  setSelectedPort: (port: string) => void
  listPorts: () => Promise<void>
  connect: (portPath: string) => Promise<void>
  disconnect: () => Promise<void>
  init: () => void
}

export const useSerialStore = create<SerialState>((set, get) => ({
  ports: [],
  selectedPort: '',
  isConnected: false,
  isLoading: false,
  error: null,

  setSelectedPort: (selectedPort) => set({ selectedPort }),

  listPorts: async () => {
    set({ isLoading: true, error: null })
    const result = await window.dmxAPI.listPorts()
    if (result.success && result.ports) {
      set({ 
        ports: result.ports, 
        selectedPort: get().selectedPort || (result.ports.length > 0 ? result.ports[0].path : ''),
        isLoading: false 
      })
    } else {
      set({ error: result.error ?? 'Failed to list ports', isLoading: false })
    }
  },

  connect: async (portPath: string) => {
    if (!portPath) return
    set({ isLoading: true, error: null })
    const result = await window.dmxAPI.connect(portPath)
    if (result.success) {
      set({ isConnected: true, selectedPort: portPath, isLoading: false })
    } else {
      set({ error: result.error ?? 'Connection failed', isLoading: false })
    }
  },

  disconnect: async () => {
    set({ isLoading: true, error: null })
    const result = await window.dmxAPI.disconnect()
    if (result.success) {
      set({ isConnected: false, isLoading: false })
    } else {
      set({ error: result.error ?? 'Disconnect failed', isLoading: false })
    }
  },

  init: () => {
    get().listPorts()
  }
}))
