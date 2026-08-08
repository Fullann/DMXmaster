import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TransformControls } from '@react-three/drei'
import type { PatchedFixture } from '@/types/fixtures'

interface Props {
  fixture: PatchedFixture
  universes: number[][]
  defaultPosition: [number, number, number]
  setupMode?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  onPositionChange?: (id: string, pos: [number, number, number]) => void
}

export function VirtualMovingHead({ 
  fixture, universes, defaultPosition, 
  setupMode, isSelected, onSelect, onPositionChange 
}: Props) {
  const headRef = useRef<THREE.Group>(null)
  const yokeRef = useRef<THREE.Group>(null)
  const baseRef = useRef<THREE.Group>(null)

  // Use saved 3D position if available, else default auto-layout
  const position = fixture.position3d ?? defaultPosition
  
  // Resolve universe
  const uIdx = fixture.universeIndex ?? 0
  const universe = universes[uIdx] || new Array(512).fill(0)

  // Map channels
  const channelMap = useMemo(() => {
    const map: Record<string, number> = {}
    fixture.profile.channels.forEach(c => {
      map[c.type] = (fixture.startAddress - 1) + (c.number - 1)
    })
    return map
  }, [fixture])

  useFrame(() => {
    if (!headRef.current || !yokeRef.current) return

    // Read raw DMX values
    const panDmx = channelMap['Pan'] !== undefined ? universe[channelMap['Pan']] : 128
    const tiltDmx = channelMap['Tilt'] !== undefined ? universe[channelMap['Tilt']] : 128
    
    // Map DMX (0-255) to Radians
    // Standard Moving Head Pan: 540 degrees (-270 to +270)
    // Standard Moving Head Tilt: 270 degrees (-135 to +135)
    const panAngle = ((panDmx / 255) * 540 - 270) * (Math.PI / 180)
    const tiltAngle = ((tiltDmx / 255) * 270 - 135) * (Math.PI / 180)

    yokeRef.current.rotation.y = -panAngle
    headRef.current.rotation.x = tiltAngle
  })

  // Calculate beam color and intensity (doesn't need to be in useFrame if we let React render it, 
  // but for 60fps it's better to update a material ref. For simplicity we'll just pull it here on render,
  // but wait... universe is updated at 44Hz and triggers a React render because useDmx calls setUniverse. 
  // So React re-renders this component at 44Hz anyway.)
  
  const intensityDmx = channelMap['Intensity'] !== undefined ? universe[channelMap['Intensity']] : 255
  const rDmx = channelMap['Red'] !== undefined ? universe[channelMap['Red']] : 255
  const gDmx = channelMap['Green'] !== undefined ? universe[channelMap['Green']] : 255
  const bDmx = channelMap['Blue'] !== undefined ? universe[channelMap['Blue']] : 255

  const intensity = intensityDmx / 255
  const color = new THREE.Color(rDmx / 255, gDmx / 255, bDmx / 255)
  // Prevent purely black lights from emitting beam if color channels are 0 but intensity is up
  if (color.r === 0 && color.g === 0 && color.b === 0 && rDmx === 0 && gDmx === 0 && bDmx === 0 && channelMap['Red'] === undefined) {
    color.setHex(0xffffff)
  }

  return (
    <group>
      {setupMode && isSelected && (
        <TransformControls
          object={baseRef.current || undefined}
          mode="translate"
          onMouseUp={(e) => {
            if (baseRef.current && onPositionChange) {
              const pos = baseRef.current.position
              onPositionChange(fixture.id, [pos.x, pos.y, pos.z])
            }
          }}
        />
      )}
      
      <group 
        ref={baseRef} 
        position={position}
        onClick={(e) => {
          if (setupMode && onSelect) {
            e.stopPropagation()
            onSelect(fixture.id)
          }
        }}
      >
        {/* SETUP MODE SELECTION HIGHLIGHT */}
        {setupMode && isSelected && (
          <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.7, 0.8, 32]} />
            <meshBasicMaterial color="#a855f7" side={THREE.DoubleSide} />
          </mesh>
        )}

        {/* BASE */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.8, 0.5, 0.8]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>

      {/* YOKE (Pans around Y axis) */}
      <group ref={yokeRef} position={[0, 0.5, 0]}>
        {/* Yoke Arms */}
        <mesh position={[-0.45, 0.5, 0]}>
          <boxGeometry args={[0.1, 1.2, 0.4]} />
          <meshStandardMaterial color="#222" roughness={0.7} />
        </mesh>
        <mesh position={[0.45, 0.5, 0]}>
          <boxGeometry args={[0.1, 1.2, 0.4]} />
          <meshStandardMaterial color="#222" roughness={0.7} />
        </mesh>
        {/* Yoke Bottom */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[1.0, 0.1, 0.4]} />
          <meshStandardMaterial color="#222" roughness={0.7} />
        </mesh>

        {/* HEAD (Tilts around X axis) */}
        <group ref={headRef} position={[0, 0.9, 0]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />
            <meshStandardMaterial color="#333" roughness={0.5} />
          </mesh>

          {/* LENS */}
          <mesh position={[0, 0.41, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>

          {/* BEAM (Cone) */}
          {intensity > 0 && (
            <mesh position={[0, 3.4, 0]}>
              <coneGeometry args={[1.5, 6, 32]} />
              <meshBasicMaterial 
                color={color} 
                transparent={true} 
                opacity={intensity * 0.3} 
                depthWrite={false} 
                blending={THREE.AdditiveBlending} 
              />
            </mesh>
          )}

          {/* Actual SpotLight for illuminating the floor */}
          {intensity > 0 && (
            <spotLight
              position={[0, 0.4, 0]}
              angle={0.25}
              penumbra={0.5}
              color={color}
              intensity={intensity * 50}
              distance={20}
              castShadow
            />
          )}
          {/* Target for SpotLight (pointing straight up from the head, which is local +Y) */}
          <object3D position={[0, 10, 0]} />
        </group>
      </group>
    </group>
    </group>
  )
}
