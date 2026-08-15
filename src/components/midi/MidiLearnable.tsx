import { useMidiMappingStore, MidiActionType } from '@/store/useMidiMappingStore'
import { useDmxMappingStore } from '@/store/useDmxMappingStore'
import { Target } from 'lucide-react'
import './MidiLearnable.css'

interface Props {
  action: MidiActionType
  label: string
  children: React.ReactNode
}

export function MidiLearnable({ action, label, children }: Props) {
  const isMidiLearning = useMidiMappingStore(s => s.learnMode)
  const midiTargetAction = useMidiMappingStore(s => s.targetAction)
  const setMidiTargetAction = useMidiMappingStore(s => s.setTargetAction)

  const isDmxLearning = useDmxMappingStore(s => s.learnMode)
  const dmxTargetAction = useDmxMappingStore(s => s.targetAction)
  const setDmxTargetAction = useDmxMappingStore(s => s.setTargetAction)

  const isLearning = isMidiLearning || isDmxLearning

  if (!isLearning) return <>{children}</>

  const isTarget = (midiTargetAction && JSON.stringify(midiTargetAction) === JSON.stringify(action)) || 
                   (dmxTargetAction && JSON.stringify(dmxTargetAction) === JSON.stringify(action))

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isMidiLearning) setMidiTargetAction(action, label)
    if (isDmxLearning) setDmxTargetAction(action as any, label)
  }

  return (
    <div className={`midi-learnable-wrapper ${isTarget ? 'is-target' : ''}`} onClick={handleClick}>
      <div style={{ pointerEvents: 'none' }}>
        {children}
      </div>
      <div className="midi-learnable-overlay">
        {isTarget ? (
          <span className="learning-text">
            <Target size={14} className="pulse-icon" /> Waiting for {isMidiLearning ? 'MIDI' : 'DMX'}...
          </span>
        ) : (
          <span className="learn-label">{label}</span>
        )}
      </div>
    </div>
  )
}
