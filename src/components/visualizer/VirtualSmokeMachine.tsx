import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDmxStore } from '@/store/useDmxStore'

interface Props {
  uIdx: number
  channelMap: Record<string, number>
}

export function VirtualSmokeMachine({ uIdx, channelMap }: Props) {
  const smokeMaterialRef = useRef<THREE.MeshBasicMaterial>(null)
  const particleGroupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    const universes = useDmxStore.getState().universes
    const universe = universes[uIdx] || new Uint8Array(512)

    // Direct Material Mutations
    // A smoke machine usually has a 'Smoke' channel, maybe an Intensity channel.
    const smokeDmx = channelMap['Smoke'] !== undefined ? universe[channelMap['Smoke']] : 
                     (channelMap['Intensity'] !== undefined ? universe[channelMap['Intensity']] : 0)

    const smokeAmount = smokeDmx / 255

    if (smokeMaterialRef.current) {
      smokeMaterialRef.current.opacity = smokeAmount * 0.6
      smokeMaterialRef.current.visible = smokeAmount > 0
    }

    if (particleGroupRef.current && smokeAmount > 0) {
      // Very simple particle animation: scale up and move forward
      const time = state.clock.getElapsedTime()
      
      particleGroupRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh
        // Reset particles that have moved too far
        if (mesh.position.y > 5) {
          mesh.position.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5)
          mesh.scale.setScalar(0.1)
        }
        
        mesh.position.y += 0.05 * (1 + Math.random()) * smokeAmount
        mesh.position.x += (Math.random() - 0.5) * 0.02 * smokeAmount
        mesh.position.z += (Math.random() - 0.5) * 0.02 * smokeAmount
        const scale = mesh.scale.x + 0.02 * smokeAmount
        mesh.scale.setScalar(scale)
      })
    }
  })

  return (
    <group position={[0, 0.2, 0]}>
      {/* Smoke Machine Body */}
      <mesh>
        <boxGeometry args={[0.8, 0.4, 1.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      
      {/* Nozzle */}
      <mesh position={[0, 0.1, 0.62]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.05, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Smoke Cloud (Static stylized volume) */}
      <mesh position={[0, 2, 2.5]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshBasicMaterial 
          ref={smokeMaterialRef}
          color="#ffffff" 
          transparent={true} 
          opacity={0} 
          depthWrite={false} 
          blending={THREE.AdditiveBlending} 
          visible={false}
        />
      </mesh>

      {/* Simple Animated Particles */}
      <group ref={particleGroupRef} position={[0, 0.2, 0.7]}>
        {Array.from({ length: 15 }).map((_, i) => (
          <mesh 
            key={i} 
            position={[(Math.random() - 0.5) * 0.5, Math.random() * 5, (Math.random() - 0.5) * 0.5]}
          >
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial 
              color="#cccccc" 
              transparent={true} 
              opacity={0.1} 
              depthWrite={false} 
              blending={THREE.AdditiveBlending} 
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
