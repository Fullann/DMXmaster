import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDmxStore } from '@/store/useDmxStore'

interface Props {
  uIdx: number
  channelMap: Record<string, number>
}

export function VirtualStaticPar({ uIdx, channelMap }: Props) {
  const lensMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const beamMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const spotLightRef = useRef<THREE.SpotLight>(null)

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

    if (beamMaterialRef.current) {
      beamMaterialRef.current.color.copy(colorHex)
      beamMaterialRef.current.opacity = intensity * 0.4
      beamMaterialRef.current.visible = intensity > 0
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

      {/* BEAM (Cone) */}
      <mesh position={[0, 3.3, 0]}>
        <coneGeometry args={[2.0, 6, 32]} />
        <meshBasicMaterial 
          ref={beamMaterialRef}
          color="#ffffff" 
          transparent={true} 
          opacity={0} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending} 
          visible={false}
        />
      </mesh>

      {/* SpotLight */}
      <spotLight
        ref={spotLightRef}
        position={[0, 0.4, 0]}
        angle={0.3}
        penumbra={0.3}
        color="#ffffff"
        intensity={0}
        distance={20}
        castShadow
        visible={false}
      />
      <object3D position={[0, 10, 0]} />
    </group>
  )
}
