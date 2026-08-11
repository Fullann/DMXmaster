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
    const rDmx = channelMap['Red'] !== undefined ? universe[channelMap['Red']] : 255
    const gDmx = channelMap['Green'] !== undefined ? universe[channelMap['Green']] : 255
    const bDmx = channelMap['Blue'] !== undefined ? universe[channelMap['Blue']] : 255

    const intensity = intensityDmx / 255
    
    // Default to white if no RGB channels are defined
    let colorHex = new THREE.Color(rDmx / 255, gDmx / 255, bDmx / 255)
    if (colorHex.r === 0 && colorHex.g === 0 && colorHex.b === 0 && rDmx === 0 && gDmx === 0 && bDmx === 0 && channelMap['Red'] === undefined) {
      colorHex.setHex(0xffffff)
    }

    if (lensMaterialRef.current) {
      lensMaterialRef.current.color.copy(colorHex)
      if (intensity === 0) {
        lensMaterialRef.current.color.setHex(0x111111)
      }
    }

    if (spotLightRef.current) {
      spotLightRef.current.color.copy(colorHex)
      spotLightRef.current.intensity = intensity * 50
      spotLightRef.current.visible = intensity > 0
    }
  })

  return (
    <group position={[0, 0.4, 0]}>
      {/* PAR Can Body */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.6, 16]} />
        <meshStandardMaterial color="#222" roughness={0.6} />
      </mesh>

      {/* LENS */}
      <mesh position={[0, 0.31, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.05, 16]} />
        <meshBasicMaterial ref={lensMaterialRef} color="#111111" />
      </mesh>

      {/* Volumetric SpotLight */}
      <SpotLight
        ref={spotLightRef as any}
        position={[0, 0.4, 0]}
        angle={0.3}
        penumbra={0.3}
        color="#ffffff"
        intensity={0}
        distance={20}
        castShadow
        volumetric={true}
        attenuation={20}
        anglePower={3}
      />
      <object3D ref={targetRef} position={[0, 10, 0]} />
    </group>
  )
}
