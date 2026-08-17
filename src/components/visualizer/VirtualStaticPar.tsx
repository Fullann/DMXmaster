import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SpotLight } from '@react-three/drei'
import { useDmxStore } from '@/store/useDmxStore'

interface Props {
  uIdx: number
  channelMap: Record<string, number>
}

export function VirtualStaticPar({ uIdx, channelMap }: Props) {
  const baseRef = useRef<THREE.Group>(null)
  const lensMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const spotLightRef = useRef<any>(null)
  const targetRef = useRef<THREE.Object3D>(null)

  useEffect(() => {
    if (spotLightRef.current && targetRef.current) {
      spotLightRef.current.target = targetRef.current
    }
  }, [])

  useFrame(() => {
    const universes = useDmxStore.getState().universes
    const universe = universes[uIdx] || new Uint8Array(512)

    // Direct Material Mutations
    const intensityDmx = channelMap['Intensity'] !== undefined ? universe[channelMap['Intensity']] : 255
    // Determine if fixture has any RGB channels
    const hasRGB = channelMap['Red'] !== undefined || channelMap['Green'] !== undefined || channelMap['Blue'] !== undefined
    
    // If it has RGB channels, missing ones default to 0. Otherwise, they all default to 255 (white).
    const defaultColor = hasRGB ? 0 : 255
    
    const rDmx = channelMap['Red'] !== undefined ? universe[channelMap['Red']] : defaultColor
    const gDmx = channelMap['Green'] !== undefined ? universe[channelMap['Green']] : defaultColor
    const bDmx = channelMap['Blue'] !== undefined ? universe[channelMap['Blue']] : defaultColor

    const intensity = intensityDmx / 255
    
    let colorHex = new THREE.Color(rDmx / 255, gDmx / 255, bDmx / 255)

    if (lensMaterialRef.current) {
      lensMaterialRef.current.color.copy(colorHex)
      if (intensity === 0) {
        lensMaterialRef.current.color.setHex(0x111111)
      }
    }

    if (spotLightRef.current) {
      spotLightRef.current.color.copy(colorHex)
      spotLightRef.current.intensity = intensity * 15 // Normal intensity
      spotLightRef.current.visible = intensity > 0
    }
  })

  return (
    <group position={[0, 0.3, 0]}>
      {/* PAR Can Body */}
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#222" roughness={0.6} />
      </mesh>

      {/* LENS */}
      <mesh position={[0, 0.31, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
        <meshBasicMaterial ref={lensMaterialRef} color="#111111" />
      </mesh>

      {/* Volumetric SpotLight */}
      <SpotLight
        ref={spotLightRef as any}
        position={[0, 0.35, 0]}
        angle={0.4}
        penumbra={0.3}
        color="#ffffff"
        intensity={0}
        distance={25}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        volumetric={false}
        attenuation={25}
        anglePower={2}
      />
      <object3D ref={targetRef} position={[0, 10, 0]} />
    </group>
  )
}
