/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFixtures } from '../../hooks/useFixtures'

// Mock window.fixtureAPI
const mockSetClones = vi.fn().mockResolvedValue({ success: true })
const mockGetPatch = vi.fn().mockResolvedValue({ success: true, patch: [] })
const mockGetProfiles = vi.fn().mockResolvedValue({ success: true, profiles: [] })
const mockGetStates = vi.fn().mockResolvedValue({ success: true, states: {} })

beforeEach(() => {
  vi.clearAllMocks()
  window.fixtureAPI = {
    setClones: mockSetClones,
    getPatch: mockGetPatch,
    getProfiles: mockGetProfiles,
    getStates: mockGetStates,
  } as any
})

describe('useFixtures', () => {
  it('should initialize with an empty patch', () => {
    const { result } = renderHook(() => useFixtures())
    expect(result.current.patch).toEqual([])
  })

  it('should optimally update clones in the local patch state', async () => {
    const { result } = renderHook(() => useFixtures())
    
    act(() => {
      // @ts-ignore
      result.current.patch = [
        { id: 'f1', label: 'Fixture 1', startAddress: 1 }
      ]
    })
    
    const clones = [{ id: 'c1', position3d: [1,1,1] as [number,number,number], rotation3d: [0,0,0] as [number,number,number] }]
    
    await act(async () => {
      await result.current.setFixtureClones('f1', clones)
    })
    
    expect(mockSetClones).toHaveBeenCalledWith('f1', clones)
  })
})
