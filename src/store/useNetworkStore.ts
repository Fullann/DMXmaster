import { create } from 'zustand'
import type { NetworkConfig, NetworkNode } from '@/types/network'

export interface NetworkState {
  config: NetworkConfig
  isLoading: boolean

  loadConfig: () => Promise<void>
  saveConfig: (newConfig: NetworkConfig) => Promise<void>
  setBroadcastEnabled: (enabled: boolean) => void
  addNode: (node: Omit<NetworkNode, 'id'>) => void
  updateNode: (id: string, updates: Partial<NetworkNode>) => void
  removeNode: (id: string) => void
  refresh: () => Promise<void>
  init: () => void
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  config: { nodes: [], broadcastEnabled: true },
  isLoading: true,

  loadConfig: async () => {
    set({ isLoading: true })
    const res = await window.networkAPI.getConfig()
    if (res.success && res.config) {
      set({ config: res.config })
    }
    set({ isLoading: false })
  },

  saveConfig: async (newConfig) => {
    set({ config: newConfig })
    await window.networkAPI.saveConfig(newConfig)
  },

  setBroadcastEnabled: (enabled) => {
    const newConfig = { ...get().config, broadcastEnabled: enabled }
    get().saveConfig(newConfig)
  },

  addNode: (node) => {
    const newNode: NetworkNode = { ...node, id: crypto.randomUUID() }
    const config = get().config
    get().saveConfig({ ...config, nodes: [...config.nodes, newNode] })
  },

  updateNode: (id, updates) => {
    const config = get().config
    get().saveConfig({
      ...config,
      nodes: config.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    })
  },

  removeNode: (id) => {
    const config = get().config
    get().saveConfig({
      ...config,
      nodes: config.nodes.filter(n => n.id !== id)
    })
  },

  refresh: () => get().loadConfig(),

  init: () => {
    get().loadConfig()
  }
}))
