import { useState, useCallback, useMemo } from 'react'
import type { PatchedFixture, ProfileEntry } from '@/types/fixtures'
import { useNetwork } from '@/hooks/useNetwork'
import { Plus, Trash2, Wand2, Copy, AlertCircle, Share2, Server } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// PatchGrid — assign fixture profiles to DMX addresses.
// ─────────────────────────────────────────────────────────────────────────────

interface PatchGridProps {
  profiles:      ProfileEntry[]
  patch:         PatchedFixture[]
  onPatch:       (profileKey: string, startAddress: number, label?: string) => Promise<void>
  onRemovePatch: (id: string) => Promise<void>
  onMorphPatch?: (id: string, key: string, addr?: number) => Promise<PatchedFixture | null>
  onClonePatch?: (src: string, dest: string) => Promise<boolean>
}

const PROFILE_COLORS = [
  'var(--ch1-color)', 'var(--ch2-color)', 'var(--ch3-color)', 'var(--ch4-color)',
]

export function PatchGrid({ profiles, patch, onPatch, onRemovePatch, onMorphPatch, onClonePatch }: PatchGridProps) {
  const [selectedProfile, setSelectedProfile] = useState(profiles[0]?.key ?? '')
  const [startAddress,    setStartAddress]    = useState(1)
  const [label,           setLabel]           = useState('')
  const [isPatching,      setIsPatching]      = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  // Compute conflict for the current address + selected profile in real-time
  const conflictingFixture = useMemo(() => {
    const profile = profiles.find(p => p.key === selectedProfile)
    if (!profile) return null
    const numCh = profile.profile.channels.length
    const endAddr = startAddress + numCh - 1
    return patch.find(f => {
      const fEnd = f.startAddress + f.profile.channels.length - 1
      return Math.max(startAddress, f.startAddress) <= Math.min(endAddr, fEnd)
    }) ?? null
  }, [selectedProfile, startAddress, patch, profiles])
  
  // Morph & Clone Modals
  const [morphingId, setMorphingId] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [morphProfile, setMorphProfile] = useState<string>('')
  const [morphAddr, setMorphAddr] = useState<number>(1)
  const [cloneSrcId, setCloneSrcId] = useState<string>('')

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
    if (conflictingFixture) {
      setError(`Conflict: overlaps with "${conflictingFixture.label}" (CH ${conflictingFixture.startAddress}–${conflictingFixture.startAddress + conflictingFixture.profile.channels.length - 1})`)
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
  }, [selectedProfile, startAddress, label, onPatch, profiles, conflictingFixture])

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
    <div className="patch-grid-view">
      
      {/* ── Active Patch List ──────────────────────────────────────────────── */}
      <div className="card patch-active-card">
        <div className="card-header">
          <span className="card-title">Active Patch ({patch.length} fixture{patch.length !== 1 ? 's' : ''})</span>
        </div>

        <div className="patch-list-wrapper">
          {patch.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No fixtures patched</div>
              <div className="empty-state-hint">Use the form to add a fixture to the universe.</div>
            </div>
          ) : (
            <div className="patch-list">
              {patch.map((fixture, idx) => {
                const color     = PROFILE_COLORS[idx % PROFILE_COLORS.length]
                const lastCh    = fixture.startAddress + fixture.profile.channels.length - 1
                const footprint = fixture.profile.channels.length
                return (
                  <div key={fixture.id} className="patch-card">
                    <span className="patch-color-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />

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

                    <div className="patch-card-actions">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setMorphingId(fixture.id)
                          setMorphProfile(fixture.profileKey)
                          setMorphAddr(fixture.startAddress)
                        }}
                      >
                        <Wand2 size={12} /> Morph
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setCloningId(fixture.id)
                          setCloneSrcId(patch.find(f => f.id !== fixture.id)?.id || '')
                        }}
                        disabled={patch.length < 2}
                      >
                        <Copy size={12} /> Clone
                      </button>
                      <button
                        className="btn-icon-sm danger"
                        onClick={() => onRemovePatch(fixture.id)}
                        title="Remove from patch"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Fixture Form ───────────────────────────────────────────────── */}
      <div className="patch-side-col">
        <div className="card patch-add-card">
          <div className="card-header">
            <span className="card-title">Add Fixture</span>
          </div>

          <div className="patch-form">
            <div className="form-group">
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

            <div className="form-row">
              <div className="form-group flex-1">
                <div className="form-label-row">
                  <label className="form-label">DMX Address</label>
                  <button className="btn btn-ghost btn-xs text-accent" onClick={handleAutoAddress}>Auto</button>
                </div>
                <input
                  type="number"
                  min={1} max={512}
                  className={`styled-input ${conflictingFixture ? 'input-error' : ''}`}
                  value={startAddress}
                  onChange={e => setStartAddress(Math.max(1, Math.min(512, Number(e.target.value))))}
                />
              </div>

              <div className="form-group flex-2">
                <label className="form-label">Label (optional)</label>
                <input
                  className="styled-input"
                  placeholder="e.g. Stage Left PAR"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                />
              </div>
            </div>

            {conflictingFixture && (
              <div className="info-banner error patch-conflict-msg">
                <AlertCircle size={14} />
                Conflicts with "{conflictingFixture.label}" (CH {conflictingFixture.startAddress}–{conflictingFixture.startAddress + conflictingFixture.profile.channels.length - 1})
              </div>
            )}
            {error && !conflictingFixture && <div className="info-banner error"><AlertCircle size={14} /> {error}</div>}

            <button
              className="btn btn-primary patch-submit-btn"
              onClick={handlePatch}
              disabled={!selectedProfile || isPatching}
            >
              <Plus size={16} /> {isPatching ? 'Patching…' : 'Patch Fixture'}
            </button>
          </div>
        </div>

        {/* ── Network Nodes ──────────────────────────────────────────────── */}
        <div className="card patch-network-card">
          <div className="card-header">
            <span className="card-title">Network Nodes (WLED/Art-Net)</span>
          </div>
          
          <div className="network-add-form">
            <div className="form-group">
              <input type="text" className="styled-input" placeholder="Node Name" value={netName} onChange={e => setNetName(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group flex-2">
                <input type="text" className="styled-input mono" placeholder="192.168.1.100" value={netIp} onChange={e => setNetIp(e.target.value)} />
              </div>
              <div className="form-group flex-1">
                <input type="number" className="styled-input mono" placeholder="Univ 0" min="0" max="32767" value={netUniv} onChange={e => setNetUniv(Number(e.target.value))} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm btn-full" onClick={handleAddNetworkNode} disabled={!netName || !netIp}>
              Add Node
            </button>
          </div>

          <div className="network-nodes-list">
            {network.config.nodes.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-hint">No nodes configured. Broadcast is disabled.</div>
              </div>
            ) : (
              <div className="network-nodes">
                {network.config.nodes.map(n => (
                  <div key={n.id} className="network-node-item">
                    <input 
                      type="checkbox" 
                      className="node-checkbox"
                      checked={n.active} 
                      onChange={(e) => network.updateNode(n.id, { active: e.target.checked })}
                    />
                    <div className="node-info">
                      <div className="node-name">{n.name}</div>
                      <div className="node-meta">
                        <span className="mono">{n.ipAddress}</span> · Univ {n.targetUniverse}
                      </div>
                    </div>
                    <button className="btn-icon-sm danger" onClick={() => network.removeNode(n.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      
      {/* Morph Modal */}
      {morphingId && (
        <div className="patch-modal-overlay">
          <div className="card patch-modal">
            <div className="card-header">
              <span className="card-title">Morph Fixture</span>
            </div>
            <div className="patch-modal-body">
              <div className="form-group">
                <label className="form-label">New Profile</label>
                <div className="select-wrapper">
                  <select className="styled-select" value={morphProfile} onChange={e => setMorphProfile(e.target.value)}>
                    {profiles.map(p => <option key={p.key} value={p.key}>{p.profile.manufacturer} {p.profile.model} ({p.profile.mode})</option>)}
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">New Start Address (Optional)</label>
                <input type="number" className="styled-input mono" value={morphAddr} onChange={e => setMorphAddr(Number(e.target.value))} />
              </div>
            </div>
            <div className="patch-modal-actions">
              <button className="btn btn-ghost" onClick={() => setMorphingId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                if (onMorphPatch) await onMorphPatch(morphingId, morphProfile, morphAddr)
                setMorphingId(null)
              }}>Apply Morph</button>
            </div>
          </div>
        </div>
      )}

      {/* Clone Modal */}
      {cloningId && (
        <div className="patch-modal-overlay">
          <div className="card patch-modal">
            <div className="card-header">
              <span className="card-title">Clone Programming</span>
            </div>
            <div className="patch-modal-body">
              <p className="patch-modal-hint">Copy all scenes, palettes, and group memberships from the source fixture into this fixture.</p>
              <div className="form-group">
                <label className="form-label">Source Fixture</label>
                <div className="select-wrapper">
                  <select className="styled-select" value={cloneSrcId} onChange={e => setCloneSrcId(e.target.value)}>
                    {patch.filter(f => f.id !== cloningId).map(f => <option key={f.id} value={f.id}>{f.label} (CH {f.startAddress})</option>)}
                  </select>
                  <span className="select-arrow">▾</span>
                </div>
              </div>
            </div>
            <div className="patch-modal-actions">
              <button className="btn btn-ghost" onClick={() => setCloningId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                if (onClonePatch && cloneSrcId) await onClonePatch(cloneSrcId, cloningId)
                setCloningId(null)
              }}>Clone</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .patch-grid-view {
          display: flex;
          gap: var(--space-4);
          height: 100%;
        }
        
        .patch-active-card {
          flex: 2;
          display: flex;
          flex-direction: column;
          padding-bottom: 0;
          overflow: hidden;
        }
        
        .patch-list-wrapper {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-4);
        }
        
        .patch-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        
        .patch-card {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          background: var(--surface-1);
          border: 1px solid var(--border);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease;
        }
        .patch-card:hover {
          background: var(--surface-2);
          border-color: var(--border-light);
        }
        
        .patch-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .patch-card-info {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 150px;
        }
        .patch-label { font-weight: 600; font-size: var(--text-base); }
        .patch-sub { font-size: var(--text-xs); color: var(--text-muted); }
        
        .patch-address-group {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          width: 200px;
          flex-shrink: 0;
        }
        .patch-address-badge {
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: var(--text-sm);
          background: rgba(255,255,255,0.05);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }
        .patch-address-range {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--text-muted);
        }
        
        .patch-card-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-left: auto;
        }
        
        .patch-side-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          min-width: 320px;
          max-width: 400px;
          overflow-y: auto;
        }
        
        .patch-form {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        
        .form-row {
          display: flex;
          gap: var(--space-3);
        }
        .form-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .form-label-row .form-label { margin-bottom: 0; }
        
        .flex-1 { flex: 1; }
        .flex-2 { flex: 2; }
        
        .btn-xs { padding: 2px 6px !important; font-size: 0.7rem !important; }
        .text-accent { color: var(--accent) !important; }
        .input-error { border-color: var(--status-error) !important; box-shadow: 0 0 0 2px rgba(255, 69, 58, 0.2) !important; }
        .patch-conflict-msg { padding: 6px 10px; font-size: var(--text-xs); margin-top: -4px; }
        
        .patch-submit-btn {
          margin-top: var(--space-2);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          font-weight: 600;
        }
        
        .network-add-form {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          border-bottom: 1px solid var(--border);
        }
        
        .network-nodes-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-4);
        }
        .network-nodes {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .network-node-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          background: var(--surface-1);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }
        .node-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
          cursor: pointer;
        }
        .node-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .node-name { font-weight: 600; font-size: var(--text-sm); }
        .node-meta { font-size: var(--text-xs); color: var(--text-muted); }
        
        .btn-full { width: 100%; }
        
        /* Modals */
        .patch-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .patch-modal {
          width: 400px;
          display: flex;
          flex-direction: column;
        }
        .patch-modal-body {
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .patch-modal-hint {
          color: var(--text-muted);
          font-size: var(--text-sm);
          margin-top: 0;
          margin-bottom: var(--space-2);
        }
        .patch-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          border-top: 1px solid var(--border);
          background: var(--surface-1);
          border-bottom-left-radius: var(--radius-lg);
          border-bottom-right-radius: var(--radius-lg);
        }
        
        .mono { font-family: var(--font-mono); }
        .btn-sm { padding: 4px 10px !important; font-size: var(--text-xs) !important; display: flex; align-items: center; gap: 4px; }
        .btn-icon-sm {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-icon-sm:hover { background: var(--bg-hover); color: var(--text-primary); }
        .btn-icon-sm.danger:hover { background: rgba(255, 69, 58, 0.15); color: var(--status-error); }
      `}</style>
    </div>
  )
}
