import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { SpotLight } from '@react-three/drei'
import { useDmxStore } from '@/store/useDmxStore'

interface Props {
  uIdx: number
  channelMap: Record<string, number>
}

// Simple gobo textures using data URIs to simulate Gobos
const GOBO_TEXTURES = [
  null, // 0 = Open
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAACWUlEQVR42u3dMWsUQRQG4PfvXqJWIghWFiIIIggWgo2lhf+k9Q8IWomlIGhjbWMj2KYKgggiCCJoYYJ4EFEjebl7O7c7x8vD7s28Dwwzy83O++a9b3d2ZgMAAAAAAAAAAAAAAAAAAAAAAACA9bY0+O+1nI+1u8v5q+X/4fK5k/N+zgdtP2CjAZDzvZwnc37dJAD8u63rOR/L+brtv19+8Xw15622gW8sAJ4v5/Wcj5r434kP8Gk5z+R80DbgjQRAzvdyXl/Q//4qfIDLOfc18YCNBMDkO5c3jPjfiw/wSTk/axvxRgLgx8p3/hL4ANfK+ULbhjcOAM83/s5fAh/gejlPtf2AjQLA9E/oU6P+/6sY4G45P2jbATcKAEt/68/xAW418YCNAsC63vpzfID75Xy1bQdsFABGvt2f4wM8aOIhGwWABf1kH7mKAe6W80zbDhg8AHI+lfOrkb/7VzHAw3I+btsBgwfA0/Jp+Xn57v+vYoDH5Xy+bQcMHADvlvN0zvcy9V/FAPfK+VTbDhh0t03m/DDnUzmP5tw38X/XALjV9r8NfBvn4T0tH4U/tZybcy7nfND2A8YfAO//v2sA7LT9b8PoA2Dq/7sGwL62/20gABAAIQACEAEgAEIABADoPgB/XgBCAIQACAAEQAiA4AMgAEIABAAIQAgAEAAhAEIABAAIQACAAIQAAAEQAiAAQAiAAIQAAAEQAiAAQAiAAIQAAAEQAiAAgAjA3y+H6aQpT2fOswAAAABJRU5ErkJggg==', // Dot
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAADYElEQVR42u3cTWsTQRgG4HdmM/kKLaUIIgh6EBEEhR68WPToP2n/g3rxUi+C4kUQT60iiqAgBEEQBEFoaQ9NaT46O7LJrC0k22zefcI8Dwy76Sa7n9mZd2beyUoAAAAAAAAAAAAAAAAAAABwM+8O/n2a80HG23IuZHwo42MZHzc+f5jxe63N1gWAnHczPjV8wP5uxo8y3tfaXB0Aybic8d4KB2w740EZT2ltpg6AnLczvsx43YIDtpXxnozvaxuYOgByHs14n/H8ige0kfE045XabN0AyHn3hO87r8EBMw3n1+ZqB8DkvDPju4zvNHjAJxlPau2vbgAk4/KMLzPebOCAJxlfqv1f7QDIeSzj/Yxn1B/QRsa3GZ+pzVYXAMl4cMJ3no36v01lPMr4Um222gCQ827Gt42/57cZ32W8qTVbfQAk41EZb2a8rL74y7iZ8YnabLUBIOd8xpcy3ld/+A8yPqi9j1YHAKPzD8sH6g//eRmf1d7H6gBIxvUZn6s/+Pcyfqy9j1UJADnvZ/ws40v1B36U8YXa+1mVAJDzcMafMn6m/qCvMv6g/t5WAwDyA0IAhAAIQASAEEAIgABEAAgBhAAIQASAEEAIgABAAIQACAEEQAiAAEARgBAAIQACAIIACAEQAiAAQAiAEEAIgBAAAQCEAAgBEAAgBIAQQAgAEABAAIQACAEEQAiAAABCAIQACAEEACAEQAiAAEAQACEAQgAEAAgBEAIIARAAQAiAEEAIgBQA4h8IAIQACAEEQAiAAABCAIQACAAEAAgBEAIgBBAEIARACIAAAEEAhAAIARAAIAQgBEAIIARAACAEQAiAEAABAEEAhAAIAQQAIAQgBEAIIARAAIACAOUA2m3YvX3C+H/G84wntffTKgEg53HGIxlvqT/olYxval/EqwSAnLd/f/mX8XP1B/1j7aXfV175B5CMy8uXfi/UH3SZ8UXt2z5VCwA5b//47+MZX6g/4Pcynqi9/1YtAKbzD0v2Vv1BH2Q8U/ueT9UDQM6bGd9nvKn+sHcyPqu9/1YfAMm4/PN3/qWML9QfdC3ji9r3eWwAwHT+4/L93881OPiVjK/V3neqB4B5b2a8zXiqwcE/zPg24xO195nqAmA6f5PxLOMnDQ76VsaXte/x1A2AVy5nPJDxQYODvZ/x2N/5V4N/2m2xO75O6S/nAAAAAElFTkSuQmCC', // Star
]

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
    // Determine if fixture has any RGB channels
    const hasRGB = channelMap['Red'] !== undefined || channelMap['Green'] !== undefined || channelMap['Blue'] !== undefined
    
    // If it has RGB channels, missing ones default to 0. Otherwise, they all default to 255 (white).
    const defaultColor = hasRGB ? 0 : 255
    
    const rDmx = channelMap['Red'] !== undefined ? universe[channelMap['Red']] : defaultColor
    const gDmx = channelMap['Green'] !== undefined ? universe[channelMap['Green']] : defaultColor
    const bDmx = channelMap['Blue'] !== undefined ? universe[channelMap['Blue']] : defaultColor
    const goboDmx = channelMap['Gobo'] !== undefined ? universe[channelMap['Gobo']] : 0

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
            distance={30}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            volumetric={false}
            attenuation={30}
            anglePower={4}
          />
          {/* Target for SpotLight */}
          <object3D ref={targetRef} position={[0, 20, 0]} />
        </group>
      </group>
    </group>
  )
}
