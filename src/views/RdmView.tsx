import React, { useEffect, useState } from 'react'
import { useRdmStore } from '@/store/useRdmStore'
import { useNetworkStore } from '@/store/useNetworkStore'
import { Search, Info, Settings2, Power } from 'lucide-react'
import type { RdmDevice } from '@/types/rdm'

export function RdmView() {
  const { isDiscovering, devices, discoverDevices, setDeviceAddress, loadDevices } = useRdmStore()
  const inputRouting = useNetworkStore(s => s.config.inputRouting) || {}
  const setInputRouting = useNetworkStore(s => s.setInputRouting)
  
  const [editingDevice, setEditingDevice] = useState<RdmDevice | null>(null)
  const [newAddress, setNewAddress] = useState<string>('')

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  const handleEdit = (device: RdmDevice) => {
    setEditingDevice(device)
    setNewAddress(device.dmxStartAddress.toString())
  }

  const handleSaveAddress = async () => {
    if (!editingDevice) return
    const addr = parseInt(newAddress)
    if (!isNaN(addr) && addr >= 1 && addr <= 512) {
      await setDeviceAddress(editingDevice.uid, addr)
    }
    setEditingDevice(null)
  }

  return (
    <div className="view-full rdm-view">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="view-header">
        <Power size={20} color="var(--accent)" />
        <h2>Remote Device Management (RDM)</h2>
        <div className="view-header-actions">
          <button 
            className="btn btn-primary" 
            onClick={discoverDevices}
            disabled={isDiscovering}
          >
            {isDiscovering ? (
              <><span className="rdm-spinner" /> Discovering...</>
            ) : (
              <><Search size={14} /> Discover Devices</>
            )}
          </button>
        </div>
      </div>

      <div className="rdm-body">
        {/* ── Info Box ──────────────────────────────────────────────────── */}
        <div className="info-banner info">
          <Info size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <p>
            RDM requires an ANSI E1.20 compliant DMX interface (like Enttec USB Pro), a bi-directional RDM splitter, 
            and RDM-compatible fixtures. During discovery, DMX transmission may be briefly interrupted.
          </p>
        </div>

        {/* ── DMX-IN Routing ──────────────────────────────────────────── */}
        <div className="rdm-section">
          <h3 className="section-title">DMX-IN Routing (Art-Net & sACN)</h3>
          <div className="rdm-routing-grid">
            {Array.from({ length: 8 }).map((_, i) => {
              const mode = inputRouting[i] || 'htp'
              return (
                <div key={i} className="rdm-routing-card">
                  <span className="rdm-routing-label">Univ {i + 1}</span>
                  <select 
                    className="styled-input rdm-routing-select" 
                    value={mode}
                    onChange={(e) => setInputRouting(i, e.target.value as 'htp' | 'remote')}
                  >
                    <option value="htp">HTP Merge</option>
                    <option value="remote">Remote Control</option>
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Device List ──────────────────────────────────────────────── */}
        <div className="rdm-device-list">
          {devices.length === 0 && !isDiscovering ? (
            <div className="empty-state">
              <Search size={40} className="empty-state-icon" />
              <div className="empty-state-title">No RDM devices found</div>
              <div className="empty-state-hint">Click "Discover Devices" to scan the network.</div>
            </div>
          ) : (
            <div className="rdm-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>UID</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>DMX Address</th>
                    <th>Mode</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map(device => (
                    <tr key={device.uid}>
                      <td className="mono">{device.uid}</td>
                      <td>{device.manufacturerLabel || `0x${device.manufacturerId.toString(16)}`}</td>
                      <td>{device.deviceModelDescription || `0x${device.deviceId.toString(16)}`}</td>
                      <td><span className="rdm-addr-badge">{device.dmxStartAddress}</span></td>
                      <td className="rdm-mode-text">Personality {device.dmxPersonality} / {device.personalityCount}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(device)}>
                          <Settings2 size={14} /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editingDevice && (
        <div className="rdm-modal-overlay" onClick={() => setEditingDevice(null)}>
          <div className="rdm-modal" onClick={e => e.stopPropagation()}>
            <h3>Configure Device</h3>
            <p className="rdm-modal-device">
              {editingDevice.manufacturerLabel} — {editingDevice.deviceModelDescription}<br/>
              <span className="mono">{editingDevice.uid}</span>
            </p>
            
            <div className="rdm-modal-field">
              <label>DMX Start Address</label>
              <input 
                type="number"
                min={1} max={512}
                className="styled-input rdm-addr-input" 
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
              />
            </div>

            <div className="rdm-modal-actions">
              <button className="btn btn-ghost" onClick={() => setEditingDevice(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAddress}>Apply</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .rdm-view {
          flex-direction: column !important;
          padding: 0 !important;
          gap: 0 !important;
        }
        .rdm-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          padding: var(--space-4) var(--space-5);
          overflow-y: auto;
        }
        .rdm-section h3 { margin-bottom: var(--space-3); }
        .rdm-routing-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-3);
        }
        .rdm-routing-card {
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .rdm-routing-label { font-weight: 700; font-size: var(--text-sm); }
        .rdm-routing-select {
          padding: 4px 8px !important;
          font-size: var(--text-xs) !important;
          max-width: 140px;
        }
        .rdm-device-list { flex: 1; min-height: 0; }
        .rdm-table-wrap { overflow-y: auto; }
        .rdm-addr-badge {
          background: var(--surface-3);
          padding: 2px 10px;
          border-radius: var(--radius-xs);
          font-weight: 700;
          font-family: var(--font-mono);
          font-size: var(--text-sm);
        }
        .rdm-mode-text { font-size: var(--text-sm); color: var(--text-secondary); }
        .mono { font-family: var(--font-mono); }
        .rdm-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
        }
        .rdm-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rdm-modal {
          background: var(--surface-0);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: var(--space-5);
          width: 380px;
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          box-shadow: var(--shadow-lg);
        }
        .rdm-modal h3 { font-size: var(--text-xl); margin: 0; }
        .rdm-modal-device { color: var(--text-muted); font-size: var(--text-sm); margin: 0; line-height: 1.6; }
        .rdm-modal-field label { display: block; margin-bottom: var(--space-2); font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
        .rdm-addr-input { width: 100% !important; font-size: var(--text-xl) !important; text-align: center !important; }
        .rdm-modal-actions { display: flex; justify-content: flex-end; gap: var(--space-2); }
        .btn-sm { padding: 4px 10px !important; font-size: var(--text-xs) !important; display: flex; align-items: center; gap: 4px; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
