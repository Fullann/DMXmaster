import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TransformControls } from '@react-three/drei'
import type { PatchedFixture } from '@/types/fixtures'
import { VirtualMovingHead } from './VirtualMovingHead'
import { VirtualStaticPar } from './VirtualStaticPar'
import { VirtualSmokeMachine } from './VirtualSmokeMachine'

interface Props {
  fixture: PatchedFixture
  defaultPosition: [number, number, number]
  setupMode?: boolean
  transformMode?: 'translate' | 'rotate'
  isSelected?: boolean
  onSelect?: (id: string) => void
  onPositionChange?: (id: string, pos: [number, number, number]) => void
  onRotationChange?: (id: string, rot: [number, number, number]) => void
}

export function VirtualFixture({
  fixture, defaultPosition, setupMode, transformMode = 'translate', isSelected, onSelect, onPositionChange, onRotationChange
}: Props) {
  const baseRef = useRef<THREE.Group>(null)
  
  // Use saved 3D position/rotation if available, else default
  const position = fixture.position3d ?? defaultPosition
  const rotation = fixture.rotation3d ?? [0, 0, 0]
  const uIdx = fixture.universeIndex ?? 0

  // Precompute channel map and infer fixture type
  const { channelMap, type } = useMemo(() => {
    const map: Record<string, number> = {}
    let hasPan = false
    let hasTilt = false
    let hasSmoke = false

    fixture.profile.channels.forEach(c => {
      map[c.type] = (fixture.startAddress - 1) + (c.number - 1)
      if (c.type === 'Pan') hasPan = true
      if (c.type === 'Tilt') hasTilt = true
      if (c.type === 'Smoke') hasSmoke = true
    })

    let inferredType: 'smoke' | 'moving_head' | 'static' = 'static'
    if (hasSmoke) {
      inferredType = 'smoke'
    } else if (hasPan || hasTilt) {
      inferredType = 'moving_head'
    }

    return { channelMap: map, type: inferredType }
  }, [fixture])

  return (
    <group>
      {/* SETUP MODE TRANSFORM CONTROLS */}
      {setupMode && isSelected ? (
        <TransformControls
          mode={transformMode}
          onMouseUp={(e) => {
            if (baseRef.current) {
              if (transformMode === 'translate' && onPositionChange) {
                const pos = baseRef.current.position
                onPositionChange(fixture.id, [pos.x, pos.y, pos.z])
              } else if (transformMode === 'rotate' && onRotationChange) {
                // Limit rotation precision to avoid floating point noise in JSON
                const rot = baseRef.current.rotation
                onRotationChange(fixture.id, [
                  Number(rot.x.toFixed(3)), 
                  Number(rot.y.toFixed(3)), 
                  Number(rot.z.toFixed(3))
                ])
              }
            }
          }}
        >
          <group ref={baseRef} position={position} rotation={rotation}>
            <MeshContent />
          </group>
        </TransformControls>
      ) : (
        <group ref={baseRef} position={position} rotation={rotation} onClick={(e) => {
          if (setupMode && onSelect) {
            e.stopPropagation()
            onSelect(fixture.id)
          }
        }}>
          <MeshContent />
        </group>
      )}
    </group>
  )

  function MeshContent() {
    return (
      <>
        {/* SETUP MODE SELECTION HIGHLIGHT */}
        {setupMode && isSelected && (
          <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.9, 1.0, 32]} />
            <meshBasicMaterial color="#a855f7" side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* RENDER INFERRED COMPONENT */}
        {type === 'smoke' && <VirtualSmokeMachine uIdx={uIdx} channelMap={channelMap} />}
        {type === 'moving_head' && <VirtualMovingHead uIdx={uIdx} channelMap={channelMap} />}
      </>
    )
  }
}
