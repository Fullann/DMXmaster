/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DashboardView } from '../../views/DashboardView'
import { useSerialStore } from '../../store/useSerialStore'

// Mock des composants enfants pour isoler le test
vi.mock('../../components/serial/SerialConnectionPanel', () => ({
  SerialConnectionPanel: () => <div data-testid="serial-panel" />
}))

vi.mock('../../components/midi/MidiMonitor', () => ({
  MidiMonitor: () => <div data-testid="midi-monitor" />
}))

vi.mock('../../components/dmx/ChannelSlider', () => ({
  ChannelSlider: ({ label }: { label: string }) => <div data-testid="channel-slider">{label}</div>
}))

describe('DashboardView', () => {
  it('should render the dashboard layout with 4 channel sliders', () => {
    render(<DashboardView />)
    
    expect(screen.getByTestId('serial-panel')).toBeInTheDocument()
    expect(screen.getByTestId('midi-monitor')).toBeInTheDocument()
    
    const sliders = screen.getAllByTestId('channel-slider')
    expect(sliders).toHaveLength(4)
    expect(sliders[0]).toHaveTextContent('Channel 1')
  })

  it('should render blackout button', () => {
    render(<DashboardView />)
    expect(screen.getByRole('button', { name: /Blackout/i })).toBeInTheDocument()
  })
})
