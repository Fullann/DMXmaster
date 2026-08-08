import { useState, useCallback, useEffect } from 'react'
import type { FixtureGroup } from '@/types/fixtures'

export function useGroups() {
  const [groups, setGroups] = useState<FixtureGroup[]>([])
  const [grandMaster, setGrandMasterState] = useState(1.0)
  const [submasters, setSubmastersState] = useState<Record<string, number>>({})

  const loadGroups = useCallback(async () => {
    const res = await window.fixtureAPI.getGroups()
    if (res.success && res.groups) {
      setGroups(res.groups)
    }
  }, [])

  useEffect(() => { loadGroups() }, [loadGroups])

  const saveGroups = useCallback(async (newGroups: FixtureGroup[]) => {
    setGroups(newGroups)
    await window.fixtureAPI.saveGroups(newGroups)
  }, [])

  const setGrandMaster = useCallback((level: number) => {
    setGrandMasterState(level)
    window.fixtureAPI.setGrandMaster(level)
  }, [])

  const setSubmaster = useCallback((groupId: string, level: number) => {
    setSubmastersState(prev => ({ ...prev, [groupId]: level }))
    window.fixtureAPI.setSubmaster(groupId, level)
  }, [])

  return {
    groups,
    saveGroups,
    grandMaster,
    setGrandMaster,
    submasters,
    setSubmaster
  }
}
