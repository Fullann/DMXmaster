import { useState, useCallback, useEffect } from 'react'
import type { NetworkConfig, NetworkNode } from '@/types/network'

export function useNetwork() {
  const [config, setConfig] = useState<NetworkConfig>({ nodes: [], broadcastEnabled: true })
  const [isLoading, setIsLoading] = useState(true)

  const loadConfig = useCallback(async () => {
    setIsLoading(true)
    const res = await window.networkAPI.getConfig()
    if (res.success && res.config) {
      setConfig(res.config)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const saveConfig = useCallback(async (newConfig: NetworkConfig) => {
    setConfig(newConfig)
    await window.networkAPI.saveConfig(newConfig)
  }, [])

  const setBroadcastEnabled = useCallback((enabled: boolean) => {
    saveConfig({ ...config, broadcastEnabled: enabled })
  }, [config, saveConfig])

  const addNode = useCallback((node: Omit<NetworkNode, 'id'>) => {
    const newNode: NetworkNode = { ...node, id: crypto.randomUUID() }
    saveConfig({ ...config, nodes: [...config.nodes, newNode] })
  }, [config, saveConfig])

  const updateNode = useCallback((id: string, updates: Partial<NetworkNode>) => {
    saveConfig({
      ...config,
      nodes: config.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    })
  }, [config, saveConfig])

  const removeNode = useCallback((id: string) => {
    saveConfig({
      ...config,
      nodes: config.nodes.filter(n => n.id !== id)
    })
  }, [config, saveConfig])

  return {
    config,
    isLoading,
    setBroadcastEnabled,
    addNode,
    updateNode,
    removeNode,
    refresh: loadConfig
  }
}
