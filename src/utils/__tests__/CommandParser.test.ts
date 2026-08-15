import { describe, it, expect } from 'vitest'
import { parseCommand } from '../CommandParser'

describe('CommandParser', () => {
  it('should parse single fixture selection', () => {
    const res = parseCommand('1')
    expect(res.type).toBe('selection')
    expect(res.selectedUserNumbers).toEqual([1])
  })

  it('should parse multiple fixture selection', () => {
    const res = parseCommand('1 + 3')
    expect(res.type).toBe('selection')
    expect(res.selectedUserNumbers).toEqual([1, 3])
  })

  it('should parse THRU syntax', () => {
    const res = parseCommand('1 THRU 5')
    expect(res.type).toBe('selection')
    expect(res.selectedUserNumbers).toEqual([1, 2, 3, 4, 5])
  })

  it('should parse subtraction', () => {
    const res = parseCommand('1 THRU 5 - 3')
    expect(res.type).toBe('selection')
    expect(res.selectedUserNumbers).toEqual([1, 2, 4, 5])
  })

  it('should apply intensity to current selection', () => {
    const res = parseCommand('@ 50', [1, 2, 3])
    expect(res.type).toBe('intensity')
    expect(res.selectedUserNumbers).toEqual([1, 2, 3])
    expect(res.intensityValue).toBe(128) // 50% of 255 = ~128
  })

  it('should handle FULL intensity', () => {
    const res = parseCommand('@ FULL', [1])
    expect(res.type).toBe('intensity')
    expect(res.intensityValue).toBe(255)
  })

  it('should handle OUT intensity', () => {
    const res = parseCommand('@ OUT', [1])
    expect(res.type).toBe('intensity')
    expect(res.intensityValue).toBe(0)
  })

  it('should parse mixed commands', () => {
    const res = parseCommand('1 THRU 3 @ FULL')
    expect(res.type).toBe('mixed')
    expect(res.selectedUserNumbers).toEqual([1, 2, 3])
    expect(res.intensityValue).toBe(255)
  })

  it('should handle CLEAR command', () => {
    const res = parseCommand('CLEAR', [1, 2, 3])
    expect(res.type).toBe('clear')
    expect(res.selectedUserNumbers).toEqual([])
  })

  it('should handle GROUP command', () => {
    const mockResolve = (groupName: string) => {
      if (groupName === '1') return [10, 11, 12]
      return []
    }
    const res = parseCommand('GROUP 1 @ FULL', [], mockResolve)
    expect(res.type).toBe('mixed')
    expect(res.selectedUserNumbers).toEqual([10, 11, 12])
    expect(res.intensityValue).toBe(255)
  })
})
