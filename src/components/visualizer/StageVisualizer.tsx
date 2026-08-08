import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { useDmx } from '@/hooks/useDmx'
import { useFixtures } from '@/hooks/useFixtures'
import { useVisualizer } from '@/hooks/useVisualizer'
import { VirtualMovingHead } from './VirtualMovingHead'

export function StageVisualizer() {
  const { universes } = useDmx()
  const { patch, setFixturePosition } = useFixtures()
  const { setupMode, toggleSetupMode, selectedFixtureId, selectFixture } = useVisualizer()

  // Auto-layout: calculate spacing based on number of fixtures
  const total = patch.length
  const spacing = 1.5
  const startX = -((total - 1) * spacing) / 2

  return (
    <div style={{ width: '100%', height: '100%', background: '#050505', display: 'flex', flexDirection: 'column' }}>
      
      <div className="section-title" style={{ padding: '1rem', position: 'absolute', zIndex: 10, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        3D Stage Visualizer
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
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '0.2rem' }}>
          {setupMode 
            ? 'Click to select fixture, drag arrows to position. Orbit is disabled.'
            : 'Left Click: Rotate | Right Click: Pan | Scroll: Zoom'
          }
        </div>
      </div>

      <Canvas shadows camera={{ position: [0, 4, 10], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        
        <ambientLight intensity={0.1} />
        <Environment preset="night" />

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#111" roughness={0.8} />
        </mesh>

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
        {patch.map((fixture, i) => {
          const x = startX + i * spacing
          return (
            <VirtualMovingHead 
              key={fixture.id} 
              fixture={fixture} 
              universes={universes} 
              defaultPosition={[x, 0, 0]} 
              setupMode={setupMode}
              isSelected={selectedFixtureId === fixture.id}
              onSelect={selectFixture}
              onPositionChange={setFixturePosition}
            />
          )
        })}

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
