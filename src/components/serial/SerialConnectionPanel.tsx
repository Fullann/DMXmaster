import { useCallback } from 'react'
import type { PortInfo } from '@/types/electron'

// ─────────────────────────────────────────────────────────────────────────────
// SerialConnectionPanel
// ─────────────────────────────────────────────────────────────────────────────

interface SerialConnectionPanelProps {
  ports:        PortInfo[]
  selectedPort: string
  isConnected:  boolean
  isLoading:    boolean
  error:        string | null
  onPortSelect: (port: string) => void
  onConnect:    () => void
  onDisconnect: () => void
  onRefresh:    () => void
}

export function SerialConnectionPanel({
  ports,
  selectedPort,
  isConnected,
  isLoading,
  error,
  onPortSelect,
  onConnect,
  onDisconnect,
  onRefresh,
}: SerialConnectionPanelProps) {
  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onPortSelect(e.target.value),
    [onPortSelect],
  )

  const handleAction = useCallback(() => {
    if (isConnected) onDisconnect()
    else onConnect()
  }, [isConnected, onConnect, onDisconnect])

  const portLabel = isConnected
    ? selectedPort.split('/').pop() ?? selectedPort
    : null

  return (
    <div className="panel serial-panel">
      <div className="panel-header">
        <span className="panel-title">DMX OUTPUT</span>
        {/* Status indicator dot */}
        <span
          className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}
          title={isConnected ? `Connected to ${selectedPort}` : 'Disconnected'}
        />
      </div>

      {/* Connection status banner */}
      <div className={`connection-status ${isConnected ? 'connected' : ''}`}>
        {isConnected ? (
          <>
            <span className="connection-icon">⚡</span>
            <span>Connected — <strong>{portLabel}</strong></span>
          </>
        ) : (
          <span>Not connected</span>
        )}
      </div>

      {/* Port selector */}
      <div className="form-group">
        <label className="form-label" htmlFor="port-select">Serial Port</label>
        <div className="select-wrapper">
          <select
            id="port-select"
            className="styled-select"
            value={selectedPort}
            onChange={handleSelectChange}
            disabled={isConnected || isLoading}
          >
            {ports.length === 0 && (
              <option value="">No ports found</option>
            )}
            {ports.map((p) => (
              <option key={p.path} value={p.path}>
                {p.path}{p.manufacturer ? ` — ${p.manufacturer}` : ''}
              </option>
            ))}
          </select>
          <span className="select-arrow">▾</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="btn-row">
        <button
          id={isConnected ? 'btn-disconnect' : 'btn-connect'}
          className={`btn ${isConnected ? 'btn-danger' : 'btn-primary'}`}
          onClick={handleAction}
          disabled={isLoading || (!isConnected && !selectedPort)}
        >
          {isLoading ? '…' : isConnected ? 'Disconnect' : 'Connect DMX'}
        </button>

        <button
          id="btn-refresh-ports"
          className="btn btn-ghost"
          onClick={onRefresh}
          disabled={isLoading || isConnected}
          title="Refresh port list"
        >
          ↺
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}
