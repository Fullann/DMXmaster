import { useMidiMappingStore, MidiActionType } from '@/store/useMidiMappingStore'
import { Target } from 'lucide-react'
import './MidiLearnable.css'

interface Props {
  action: MidiActionType
  label: string
  children: React.ReactNode
}

export function MidiLearnable({ action, label, children }: Props) {
  const isLearning = useMidiMappingStore(s => s.learnMode)
  const targetAction = useMidiMappingStore(s => s.targetAction)
  const setTargetAction = useMidiMappingStore(s => s.setTargetAction)

  if (!isLearning) return <>{children}</>

  const isTarget = targetAction && JSON.stringify(targetAction) === JSON.stringify(action)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setTargetAction(action, label)
  }

  return (
    <div className={`midi-learnable-wrapper ${isTarget ? 'is-target' : ''}`} onClick={handleClick}>
      <div style={{ pointerEvents: 'none' }}>
        {children}
      </div>
      <div className="midi-learnable-overlay">
        {isTarget ? (
          <span className="learning-text">
            <Target size={14} className="pulse-icon" /> Waiting for MIDI...
          </span>
        ) : (
          <span className="learn-label">{label}</span>
        )}
      </div>
    </div>
  )
}
