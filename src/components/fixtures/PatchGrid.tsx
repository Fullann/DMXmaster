import { useState, useCallback } from 'react'
import type { PatchedFixture, ProfileEntry } from '@/types/fixtures'
import { useNetwork } from '@/hooks/useNetwork'
import { GroupManager } from './GroupManager'

// ─────────────────────────────────────────────────────────────────────────────
// PatchGrid — assign fixture profiles to DMX addresses.
// ─────────────────────────────────────────────────────────────────────────────

interface PatchGridProps {
  profiles:      ProfileEntry[]
  patch:         PatchedFixture[]
  onPatch:       (profileKey: string, startAddress: number, label?: string) => Promise<void>
  onRemovePatch: (id: string) => Promise<void>
}

const PROFILE_COLORS = [
  'var(--ch1-color)', 'var(--ch2-color)', 'var(--ch3-color)', 'var(--ch4-color)',
]

export function PatchGrid({ profiles, patch, onPatch, onRemovePatch }: PatchGridProps) {
  const [selectedProfile, setSelectedProfile] = useState(profiles[0]?.key ?? '')
  const [startAddress,    setStartAddress]    = useState(1)
  const [label,           setLabel]           = useState('')
  const [isPatching,      setIsPatching]      = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const network = useNetwork()
  const [netName, setNetName] = useState('')
  const [netIp, setNetIp] = useState('192.168.1.100')
  const [netUniv, setNetUniv] = useState(0)

  const handlePatch = useCallback(async () => {
    if (!selectedProfile) return
    if (startAddress < 1 || startAddress > 512) {
      setError('Address must be 1–512')
      return
    }
    setError(null)
    setIsPatching(true)
    await onPatch(selectedProfile, startAddress, label.trim() || undefined)
    setIsPatching(false)
    setLabel('')
    // Suggest next free address (rough: last patch address + last profile channels)
    const profile = profiles.find(p => p.key === selectedProfile)
    if (profile) {
      setStartAddress(prev => Math.min(512, prev + profile.profile.channels.length))
    }
  }, [selectedProfile, startAddress, label, onPatch, profiles])

  const handleAutoAddress = useCallback(() => {
    const profile = profiles.find(p => p.key === selectedProfile)
    if (!profile) return
    const numChannels = profile.profile.channels.length
    
    // Find first block of `numChannels` free addresses
    for (let addr = 1; addr <= 512 - numChannels + 1; addr++) {
      let isFree = true
      for (let i = 0; i < numChannels; i++) {
        const checkAddr = addr + i
        const isOccupied = patch.some(f => {
          const fStart = f.startAddress
          const fEnd = fStart + f.profile.channels.length - 1
          return checkAddr >= fStart && checkAddr <= fEnd
        })
        if (isOccupied) {
          isFree = false
          break
        }
      }
      if (isFree) {
        setStartAddress(addr)
        return
      }
    }
    setError('No contiguous free addresses available for this fixture.')
  }, [patch, profiles, selectedProfile])

  const handleAddNetworkNode = () => {
    if (!netName || !netIp) return
    network.addNode({
      name: netName,
      ipAddress: netIp,
      protocol: 'ArtNet',
      targetUniverse: netUniv,
      active: true
    })
    setNetName('')
  }

  return (
    <div className="patch-grid">
      <div className="patch-active-section">
        <div className="panel-sublabel">Active Patch ({patch.length} fixture{patch.length !== 1 ? 's' : ''})</div>

        {patch.length === 0 ? (
          <div className="patch-empty">No fixtures patched — add one below.</div>
        ) : (
          <div className="patch-list">
            {patch.map((fixture, idx) => {
              const color     = PROFILE_COLORS[idx % PROFILE_COLORS.length]
              const lastCh    = fixture.startAddress + fixture.profile.channels.length - 1
              const footprint = fixture.profile.channels.length
              return (
                <div key={fixture.id} className="patch-card">
                  <span className="patch-color-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />

                  <div className="patch-card-info">
                    <span className="patch-label">{fixture.label}</span>
                    <span className="patch-sub">
                      {fixture.profile.manufacturer} · {fixture.profile.mode}
                    </span>
                  </div>

                  <div className="patch-address-group">
                    <span className="patch-address-badge" style={{ color }}>
                      CH {String(fixture.startAddress).padStart(3, '0')}
                    </span>
                    <span className="patch-address-range">
                      → {String(lastCh).padStart(3, '0')} ({footprint}ch)
                    </span>
                  </div>

                  <button
                    className="btn btn-ghost patch-remove-btn"
                    onClick={() => onRemovePatch(fixture.id)}
                    title="Remove from patch"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add fixture ─────────────────────────────────────────────────────── */}
      <div className="patch-add-section">
        <div className="panel-sublabel">Add Fixture</div>

        <div className="patch-add-form">
          {/* Profile picker */}
          <div className="form-group patch-profile-group">
            <label className="form-label">Profile</label>
            <div className="select-wrapper">
              <select
                className="styled-select"
                value={selectedProfile}
                onChange={e => setSelectedProfile(e.target.value)}
              >
                {profiles.length === 0 && <option value="">No profiles loaded</option>}
                {profiles.map(p => (
                  <option key={p.key} value={p.key}>
                    {p.profile.manufacturer} {p.profile.model} ({p.profile.mode})
                  </option>
                ))}
              </select>
              <span className="select-arrow">▾</span>
            </div>
          </div>

          <div className="patch-add-row2">
            {/* Start address */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>DMX Address</span>
                <button 
                  className="btn btn-ghost" 
                  style={{ fontSize: '0.75rem', padding: '2px 8px' }}
                  onClick={handleAutoAddress}
                >
                  Auto-Find
                </button>
              </label>
              <input
                type="number"
                min={1} max={512}
                className="styled-input patch-address-input"
                value={startAddress}
                onChange={e => setStartAddress(Math.max(1, Math.min(512, Number(e.target.value))))}
              />
            </div>

            {/* Label */}
            <div className="form-group patch-label-group">
              <label className="form-label">Label (optional)</label>
              <input
                className="styled-input"
                placeholder="e.g. Stage Left PAR"
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="btn btn-primary"
            onClick={handlePatch}
            disabled={!selectedProfile || isPatching}
          >
            {isPatching ? 'Patching…' : '+ Patch Fixture'}
          </button>
        </div>
      </div>

      {/* ── Network Nodes (Art-Net / sACN) ───────────────────────────────── */}
      <div className="panel" style={{ marginTop: '1.5rem' }}>
        <div className="panel-header">
          <span className="panel-title">Network Output Nodes (WLED / Art-Net)</span>
        </div>
        <div className="patch-layout" style={{ marginTop: '1rem' }}>
          
          <div className="patch-form">
            <div className="form-group">
              <label className="form-label">Node Name</label>
              <input type="text" className="styled-input" placeholder="e.g. Living Room Strip" value={netName} onChange={e => setNetName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">IP Address</label>
              <input type="text" className="styled-input" placeholder="192.168.1.100" value={netIp} onChange={e => setNetIp(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Target Universe</label>
              <input type="number" className="styled-input" min="0" max="32767" value={netUniv} onChange={e => setNetUniv(Number(e.target.value))} />
            </div>
            <button className="btn btn-primary" onClick={handleAddNetworkNode} disabled={!netName || !netIp}>
              Add Node
            </button>
          </div>

          <div className="patch-list">
            {network.config.nodes.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No network nodes configured. Broadcast will not occur.
              </div>
            ) : (
              <table className="patch-table">
                <thead>
                  <tr>
                    <th>Active</th>
                    <th>Name</th>
                    <th>IP Address</th>
                    <th>Universe</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {network.config.nodes.map(n => (
                    <tr key={n.id}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={n.active} 
                          onChange={(e) => network.updateNode(n.id, { active: e.target.checked })}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td>{n.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{n.ipAddress}</td>
                      <td>{n.targetUniverse}</td>
                      <td>
                        <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => network.removeNode(n.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
