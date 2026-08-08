/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDmxStore } from '../../store/useDmxStore'

describe('useDmxStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useDmxStore.setState({
      universes: Array.from({ length: 8 }, () => new Array(512).fill(0)),
    })
    vi.clearAllMocks()
  })

  it('should have initial state of 8 empty universes', () => {
    const { result } = renderHook(() => useDmxStore())
    expect(result.current.universes.length).toBe(8)
    expect(result.current.universe.length).toBe(512)
    expect(result.current.universe[0]).toBe(0)
  })

  it('should call window.dmxAPI.updateChannel when updateChannel is called', async () => {
    const { result } = renderHook(() => useDmxStore())
    
    await act(async () => {
      await result.current.updateChannel(1, 255)
    })

    // Local optimistic update
    expect(result.current.universe[0]).toBe(255)
    // API call verification
    expect(window.dmxAPI.updateChannel).toHaveBeenCalledWith(1, 255, 0)
  })

  it('should call blackout and clear universes', async () => {
    const { result } = renderHook(() => useDmxStore())
    
    // Setup some data
    act(() => {
      useDmxStore.setState({
        universes: Array.from({ length: 8 }, () => new Array(512).fill(255))
      })
    })

    await act(async () => {
      await result.current.blackout()
    })

    expect(result.current.universe[0]).toBe(0)
    expect(window.dmxAPI.blackout).toHaveBeenCalled()
  })
})
