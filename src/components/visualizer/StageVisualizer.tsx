import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { ExternalLink } from 'lucide-react'
import { useFixtures } from '@/hooks/useFixtures'
import { useVisualizer } from '@/hooks/useVisualizer'
import { VirtualFixture } from './VirtualFixture'

export function StageVisualizer() {
  const { patch, setFixturePosition, setFixtureRotation, setFixtureClones } = useFixtures()
  const { setupMode, toggleSetupMode, selectedFixtureId, selectFixture, transformMode, toggleTransformMode } = useVisualizer()

  // Auto-layout: calculate spacing based on number of fixtures
  const total = patch.length
  const spacing = 1.5
  const startX = -((total - 1) * spacing) / 2

  const handleDuplicate = () => {
    if (!selectedFixtureId) return
    const [originalId, cloneId] = selectedFixtureId.split('::')
    const fixture = patch.find(f => f.id === originalId)
    if (!fixture) return
    
    let pos = fixture.position3d || [0, 0, 0]
    let rot = fixture.rotation3d || [0, 0, 0]
    if (cloneId && fixture.clones) {
      const clone = fixture.clones.find(c => c.id === cloneId)
      if (clone) {
        pos = clone.position3d
        rot = clone.rotation3d
      }
    }
    
    const newCloneId = Math.random().toString(36).substr(2, 9)
    const newClones = [...(fixture.clones || []), {
      id: newCloneId,
      position3d: [pos[0] + 0.5, pos[1], pos[2]] as [number, number, number],
      rotation3d: rot
    }]
    setFixtureClones(originalId, newClones)
    selectFixture(`${originalId}::${newCloneId}`)
  }

  const handleDeleteClone = () => {
    if (!selectedFixtureId) return
    const [originalId, cloneId] = selectedFixtureId.split('::')
    if (!cloneId) return // Cannot delete original
    
    const fixture = patch.find(f => f.id === originalId)
    if (!fixture || !fixture.clones) return
    
    const newClones = fixture.clones.filter(c => c.id !== cloneId)
    setFixtureClones(originalId, newClones)
    selectFixture(originalId)
  }

  const handlePositionChange = (id: string, pos: [number, number, number]) => {
    const [originalId, cloneId] = id.split('::')
    if (cloneId) {
      const fixture = patch.find(f => f.id === originalId)
      if (!fixture || !fixture.clones) return
      const newClones = fixture.clones.map(c => c.id === cloneId ? { ...c, position3d: pos } : c)
      setFixtureClones(originalId, newClones)
    } else {
      setFixturePosition(originalId, pos)
    }
  }

  const handleRotationChange = (id: string, rot: [number, number, number]) => {
    const [originalId, cloneId] = id.split('::')
    if (cloneId) {
      const fixture = patch.find(f => f.id === originalId)
      if (!fixture || !fixture.clones) return
      const newClones = fixture.clones.map(c => c.id === cloneId ? { ...c, rotation3d: rot } : c)
      setFixtureClones(originalId, newClones)
    } else {
      setFixtureRotation(originalId, rot)
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', background: '#050505', display: 'flex', flexDirection: 'column' }}>
      
      <div className="section-title" style={{ padding: '1rem', position: 'absolute', zIndex: 10, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        3D Stage Visualizer
        <button 
          onClick={() => window.appAPI.openVisualizerWindow()}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-primary)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="Detach 3D Map to another screen"
        >
          <ExternalLink size={12} /> Detach
        </button>
        <button 
          onClick={toggleSetupMode}
          style={{
            background: setupMode ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${setupMode ? 'var(--accent)' : 'var(--border)'}`,
            color: setupMode ? 'var(--text-primary)' : 'var(--text-muted)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          {setupMode ? 'Done (Setup Mode Active)' : 'Setup Mode'}
        </button>
        {setupMode && (
          <button 
            onClick={toggleTransformMode}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid rgba(255,255,255,0.1)`,
              color: 'var(--text-primary)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Mode: {transformMode === 'translate' ? 'Move' : 'Rotate'}
          </button>
        )}
        {setupMode && selectedFixtureId && (
          <button 
            onClick={handleDuplicate}
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: `1px solid rgba(59,130,246,0.5)`,
              color: 'var(--text-primary)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Duplicate
          </button>
        )}
        {setupMode && selectedFixtureId && selectedFixtureId.includes('::') && (
          <button 
            onClick={handleDeleteClone}
            style={{
              background: 'rgba(239,68,68,0.2)',
              border: `1px solid rgba(239,68,68,0.5)`,
              color: 'var(--text-primary)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Delete Clone
          </button>
        )}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '0.2rem' }}>
          {setupMode 
            ? 'Click to select fixture, drag arrows to position. Orbit is disabled.'
            : 'Left Click: Rotate | Right Click: Pan | Scroll: Zoom'
          }
        </div>
      </div>

      <Canvas shadows camera={{ position: [0, 4, 10], fov: 45 }} style={{ flex: 1 }}>
        <color attach="background" args={['#888888']} />
        
        {/* Simulate Haze/Fog in the scene - pushed back so it doesn't obscure the stage */}
        <fog attach="fog" args={['#888888', 10, 50]} />
        
        {/* Much stronger ambient light to clearly see the scene */}
        <ambientLight intensity={1.5} />
        <hemisphereLight skyColor="#ffffff" groundColor="#444444" intensity={1.5} />

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#333333" roughness={0.8} metalness={0.2} />
        </mesh>

        {/* Back Truss / Rigging */}
        <group position={[0, 4, -2]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.1, 20, 8]} />
            <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 20, 8]} />
            <meshStandardMaterial color="#444" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Truss crossbars */}
          {Array.from({ length: 20 }).map((_, i) => (
            <mesh key={i} position={[-9.5 + i, 0.2, 0]} rotation={[Math.PI / 4, 0, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.5]} />
              <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <mesh key={`cross-${i}`} position={[-9.5 + i, 0.2, 0]} rotation={[-Math.PI / 4, 0, 0]} castShadow>
              <cylinderGeometry args={[0.02, 0.02, 0.5]} />
              <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
        </group>

        <Grid 
          renderOrder={-1} 
          position={[0, 0.01, 0]} 
          infiniteGrid 
          fadeDistance={30} 
          fadeStrength={5} 
          cellSize={1} 
          sectionSize={5}
          cellColor="#333" 
          sectionColor="#555" 
        />

        {/* Render Patched Fixtures */}
        <Suspense fallback={null}>
          {patch.map((fixture, i) => {
            const x = startX + i * spacing
            const elements = [
              <VirtualFixture 
                key={fixture.id} 
                fixture={fixture} 
                defaultPosition={[x, 0, 0]} 
                setupMode={setupMode}
                transformMode={transformMode}
                isSelected={selectedFixtureId === fixture.id}
                onSelect={selectFixture}
                onPositionChange={handlePositionChange}
                onRotationChange={handleRotationChange}
              />
            ]
            
            // Render any visual clones for this fixture
            if (fixture.clones) {
              fixture.clones.forEach(clone => {
                const cloneFixture = { ...fixture, id: `${fixture.id}::${clone.id}`, position3d: clone.position3d, rotation3d: clone.rotation3d }
                elements.push(
                  <VirtualFixture 
                    key={cloneFixture.id} 
                    fixture={cloneFixture} 
                    defaultPosition={[x, 0, 0]} 
                    setupMode={setupMode}
                    transformMode={transformMode}
                    isSelected={selectedFixtureId === cloneFixture.id}
                    onSelect={selectFixture}
                    onPositionChange={handlePositionChange}
                    onRotationChange={handleRotationChange}
                  />
                )
              })
            }
            return elements
          })}
        </Suspense>

        <OrbitControls 
          makeDefault 
          target={[0, 2, 0]} 
          maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below the floor
          enabled={!setupMode} // Disable orbiting when dragging fixtures
        />
      </Canvas>
    </div>
  )
}
