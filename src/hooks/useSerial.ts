import { useState, useCallback, useEffect } from 'react'
import type { PortInfo } from '@/types/electron'

// ─────────────────────────────────────────────────────────────────────────────
// useSerial — manages serial port discovery, selection, and connection state.
//
// All IPC calls go through window.dmxAPI (contextBridge) — no direct Node.js.
// ─────────────────────────────────────────────────────────────────────────────

export interface SerialState {
  ports: PortInfo[]
  selectedPort: string
  isConnected: boolean
  isLoading: boolean
  error: string | null
}

export function useSerial() {
  const [ports, setPorts]               = useState<PortInfo[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [isConnected, setIsConnected]   = useState(false)
  const [isLoading, setIsLoading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)

  // ── Port discovery ──────────────────────────────────────────────────────────

  const listPorts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await window.dmxAPI.listPorts()
    setIsLoading(false)
    if (result.success && result.ports) {
      setPorts(result.ports)
      // Auto-select first port if none is selected
      if (!selectedPort && result.ports.length > 0) {
        setSelectedPort(result.ports[0].path)
      }
    } else {
      setError(result.error ?? 'Failed to list ports')
    }
  }, [selectedPort])

  // Scan ports once on mount
  useEffect(() => { listPorts() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connection management ───────────────────────────────────────────────────

  const connect = useCallback(async (portPath: string) => {
    if (!portPath) return
    setIsLoading(true)
    setError(null)
    const result = await window.dmxAPI.connect(portPath)
    setIsLoading(false)
    if (result.success) {
      setIsConnected(true)
      setSelectedPort(portPath)
    } else {
      setError(result.error ?? 'Connection failed')
    }
  }, [])

  const disconnect = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const result = await window.dmxAPI.disconnect()
    setIsLoading(false)
    if (result.success) {
      setIsConnected(false)
    } else {
      setError(result.error ?? 'Disconnect failed')
    }
  }, [])

  return {
    ports,
    selectedPort,
    setSelectedPort,
    isConnected,
    isLoading,
    error,
    listPorts,
    connect,
    disconnect,
  }
}
