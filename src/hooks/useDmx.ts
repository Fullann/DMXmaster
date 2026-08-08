import { useState, useCallback, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useDmx — manages the local DMX universe mirror and IPC calls.
//
// Design decisions:
//  • Optimistic local state update first → UI feels instant.
//  • Subscribes to onUniverseUpdate for any push model data from the main
//    process (e.g., future EffectsEngine ticks). This is wired up but will
//    be a no-op until the main process calls pushUniverseUpdate().
//  • updateChannel / updateChannels are stable references (useCallback with
//    no deps) so they can safely be listed in useEffect dependency arrays.
// ─────────────────────────────────────────────────────────────────────────────

export function useDmx() {
  // Full 8-universe local mirror. Initialised to all zeros.
  const [universes, setUniverses] = useState<number[][]>(() => 
    Array.from({ length: 8 }, () => new Array(512).fill(0))
  )

  // Alias for backward compatibility (defaults to universe 0)
  const universe = universes[0]

  // ── Push updates (main → renderer) ─────────────────────────────────────────
  // Subscribes to universe state pushed by the main process.
  // The main process will send the full array of universes.
  useEffect(() => {
    // We would need an updated event in ipcHandlers if the main process pushes it.
    // For now we assume the event gives `number[][]` or `number[]`. We'll handle both.
    const unsubscribe = window.dmxAPI.onUniverseUpdate((newUniverseOrUniverses: any) => {
      if (Array.isArray(newUniverseOrUniverses) && Array.isArray(newUniverseOrUniverses[0])) {
        setUniverses([...newUniverseOrUniverses])
      } else {
        // Fallback for old behaviour (pushes universe 0 only)
        setUniverses(prev => {
          const next = [...prev]
          next[0] = [...newUniverseOrUniverses]
          return next
        })
      }
    })
    return unsubscribe // Removes the ipcRenderer listener on unmount
  }, [])

  // ── Universe mutation ───────────────────────────────────────────────────────

  /**
   * Update a single channel. Optimistically updates local state, then fires IPC.
   * @param channel  1-indexed (1–512)
   * @param value    0–255
   * @param universeIdx 0-based universe index (default 0)
   */
  const updateChannel = useCallback(async (channel: number, value: number, universeIdx = 0) => {
    // Clamp defensively
    const safeVal = Math.max(0, Math.min(255, value))
    const u = Math.max(0, Math.min(7, universeIdx))

    // Optimistic local update
    setUniverses((prev) => {
      const next = [...prev]
      next[u] = [...next[u]]
      next[u][channel - 1] = safeVal
      return next
    })

    await window.dmxAPI.updateChannel(channel, safeVal, u)
  }, [])

  /**
   * Update multiple channels atomically.
   * @param channelMap  { [1-indexed channel]: value }
   * @param universeIdx 0-based universe index (default 0)
   */
  const updateChannels = useCallback(async (channelMap: Record<number, number>, universeIdx = 0) => {
    const u = Math.max(0, Math.min(7, universeIdx))
    setUniverses((prev) => {
      const next = [...prev]
      next[u] = [...next[u]]
      for (const [ch, val] of Object.entries(channelMap)) {
        const safeVal = Math.max(0, Math.min(255, val))
        next[u][Number(ch) - 1] = safeVal
      }
      return next
    })

    await window.dmxAPI.updateChannels(channelMap, u)
  }, [])

  /**
   * Set all 512 channels to 0 (blackout). Also resets local mirror.
   */
  const blackout = useCallback(async () => {
    setUniverses((prev) => prev.map(() => new Array(512).fill(0)))
    await window.dmxAPI.blackout()
  }, [])

  return {
    universe,      // Alias for universes[0]
    universes,
    updateChannel,
    updateChannels,
    blackout
  }
}
