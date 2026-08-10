import { useState, useCallback } from 'react'

export type TransformMode = 'translate' | 'rotate'

export function useVisualizer() {
  const [setupMode, setSetupMode] = useState(false)
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null)
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')

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

  const toggleTransformMode = useCallback(() => {
    setTransformMode(prev => prev === 'translate' ? 'rotate' : 'translate')
  }, [])

  return {
    setupMode,
    toggleSetupMode,
    selectedFixtureId,
    selectFixture,
    transformMode,
    toggleTransformMode
  }
}
