import { create } from 'zustand'
import type { RdmDevice } from '../types/rdm'

interface RdmState {
  isDiscovering: boolean
  devices: RdmDevice[]
  
  discoverDevices: () => Promise<void>
  setDeviceAddress: (uid: string, newAddress: number) => Promise<boolean>
  loadDevices: () => Promise<void>
}

export const useRdmStore = create<RdmState>((set, get) => ({
  isDiscovering: false,
  devices: [],

  discoverDevices: async () => {
    set({ isDiscovering: true })
    await window.rdmAPI.discover()
    await get().loadDevices()
    set({ isDiscovering: false })
  },

  setDeviceAddress: async (uid: string, newAddress: number) => {
    const res = await window.rdmAPI.setAddress(uid, newAddress)
    if (res.success) {
      await get().loadDevices()
      return true
    }
    return false
  },

  loadDevices: async () => {
    const res = await window.rdmAPI.getDevices()
    if (res.success && res.devices) {
      set({ devices: res.devices })
    }
  }
}))
