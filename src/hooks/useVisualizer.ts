import { useState, useCallback } from 'react'

export function useVisualizer() {
  const [setupMode, setSetupMode] = useState(false)
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null)

  const toggleSetupMode = useCallback(() => {
    setSetupMode(prev => !prev)
    if (setupMode) {
      // Exiting setup mode clears selection
      setSelectedFixtureId(null)
    }
  }, [setupMode])

  const selectFixture = useCallback((id: string | null) => {
    setSelectedFixtureId(id)
  }, [])

  return {
    setupMode,
    toggleSetupMode,
    selectedFixtureId,
    selectFixture,
  }
}
