import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SpotLight } from '@react-three/drei'
import { useDmxStore } from '@/store/useDmxStore'

interface Props {
  uIdx: number
  channelMap: Record<string, number>
}

export function VirtualMovingHead({ uIdx, channelMap }: Props) {
  const headRef = useRef<THREE.Group>(null)
  const yokeRef = useRef<THREE.Group>(null)
  
  // Materials and Lights refs for high-performance direct mutations
  const lensMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const spotLightRef = useRef<THREE.SpotLight>(null)
  const targetRef = useRef<THREE.Object3D>(null)

  useEffect(() => {
    if (spotLightRef.current && targetRef.current) {
      spotLightRef.current.target = targetRef.current
    }
  }, [])

  useFrame(() => {
    if (!headRef.current || !yokeRef.current) return
    
    // Read raw DMX values directly from the global store
    const universes = useDmxStore.getState().universes
    const universe = universes[uIdx] || new Uint8Array(512)

    const panDmx = channelMap['Pan'] !== undefined ? universe[channelMap['Pan']] : 128
    const tiltDmx = channelMap['Tilt'] !== undefined ? universe[channelMap['Tilt']] : 128
    
    // Map DMX (0-255) to Radians
    const panAngle = ((panDmx / 255) * 540 - 270) * (Math.PI / 180)
    const tiltAngle = ((tiltDmx / 255) * 270 - 135) * (Math.PI / 180)

    yokeRef.current.rotation.y = -panAngle
    headRef.current.rotation.x = tiltAngle
    
    // Direct Material Mutations
    const intensityDmx = channelMap['Intensity'] !== undefined ? universe[channelMap['Intensity']] : 255
    const rDmx = channelMap['Red'] !== undefined ? universe[channelMap['Red']] : 255
    const gDmx = channelMap['Green'] !== undefined ? universe[channelMap['Green']] : 255
    const bDmx = channelMap['Blue'] !== undefined ? universe[channelMap['Blue']] : 255

    const intensity = intensityDmx / 255
    
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
    <group position={[0, 0, 0]}>
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
            <meshBasicMaterial ref={lensMaterialRef} color="#111111" />
          </mesh>

          {/* Volumetric SpotLight */}
          <SpotLight
            ref={spotLightRef as any}
            position={[0, 0.4, 0]}
            angle={0.25}
            penumbra={0.5}
            color="#ffffff"
            intensity={0}
            distance={20}
            castShadow
            volumetric={true}
            attenuation={20}
            anglePower={4}
          />
          {/* Target for SpotLight */}
          <object3D ref={targetRef} position={[0, 10, 0]} />
        </group>
      </group>
    </group>
  )
}
