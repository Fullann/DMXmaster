import React, { useEffect, useState } from 'react'
import { useRdmStore } from '@/store/useRdmStore'
import { Search, Info, Settings2, Power } from 'lucide-react'
import type { RdmDevice } from '@/types/rdm'

export function RdmView() {
  const { isDiscovering, devices, discoverDevices, setDeviceAddress, loadDevices } = useRdmStore()
  
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
    <div className="view-full" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a' }}>
      
      {/* ── Topbar ───────────────────────────────────────────────────────── */}
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Power size={24} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Remote Device Management (RDM)</h2>
        </div>

        <div>
          <button 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '8px' }}
            onClick={discoverDevices}
            disabled={isDiscovering}
          >
            {isDiscovering ? (
              <><span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Discovering...</>
            ) : (
              <><Search size={16} /> Discover Devices</>
            )}
          </button>
        </div>
      </header>

      {/* ── Info Box ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '1rem 1.5rem' }}>
        <div style={{ 
          background: 'rgba(0,188,212,0.1)', border: '1px solid rgba(0,188,212,0.3)', 
          padding: '1rem', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'flex-start' 
        }}>
          <Info size={24} color="#00bcd4" />
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
            RDM requires an ANSI E1.20 compliant DMX interface (like Enttec USB Pro), a bi-directional RDM splitter, 
            and RDM-compatible fixtures. During discovery, DMX transmission may be briefly interrupted.
          </p>
        </div>
      </div>

      {/* ── Device List ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '0 1.5rem 1.5rem 1.5rem', overflow: 'auto' }}>
        {devices.length === 0 && !isDiscovering ? (
          <div style={{ 
            height: '100%', display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' 
          }}>
            <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No RDM devices found on the network.</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Click "Discover Devices" to scan.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <th style={{ padding: '1rem' }}>UID</th>
                <th style={{ padding: '1rem' }}>Manufacturer</th>
                <th style={{ padding: '1rem' }}>Model</th>
                <th style={{ padding: '1rem' }}>DMX Address</th>
                <th style={{ padding: '1rem' }}>Mode</th>
                <th style={{ padding: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(device => (
                <tr key={device.uid} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{device.uid}</td>
                  <td style={{ padding: '1rem' }}>{device.manufacturerLabel || `0x${device.manufacturerId.toString(16)}`}</td>
                  <td style={{ padding: '1rem' }}>{device.deviceModelDescription || `0x${device.deviceId.toString(16)}`}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', 
                      borderRadius: '4px', fontWeight: 'bold' 
                    }}>
                      {device.dmxStartAddress}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    Personality {device.dmxPersonality} / {device.personalityCount}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => handleEdit(device)}
                      style={{ padding: '0.5rem', borderRadius: '6px' }}
                    >
                      <Settings2 size={16} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editingDevice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="panel p-lg" style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>Configure Device</h3>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {editingDevice.manufacturerLabel} - {editingDevice.deviceModelDescription}<br/>
              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{editingDevice.uid}</span>
            </p>
            
            <div>
              <label className="text-muted" style={{ display: 'block', marginBottom: '0.5rem' }}>DMX Start Address</label>
              <input 
                type="number"
                min={1} max={512}
                className="styled-input" style={{ width: '100%', fontSize: '1.2rem', textAlign: 'center' }}
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-ghost" onClick={() => setEditingDevice(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAddress}>Apply to Device</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
