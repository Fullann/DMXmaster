import { FixtureBuilder } from '@/components/fixtures/FixtureBuilder'
import { AiImportTool }   from '@/components/fixtures/AiImportTool'
import { useFixturesStore } from '@/store/useFixturesStore'

export function LibraryView() {
  const fixtures = useFixturesStore()

  return (
    <div className="view-full library-view">
      <div className="library-col">
        <div className="panel">
          <FixtureBuilder onSave={fixtures.saveProfile} />
        </div>
      </div>
      <div className="library-col">
        <div className="panel">
          <AiImportTool onSave={fixtures.saveProfile} />
        </div>
        <div className="panel profile-list-panel">
          <div className="panel-header">
            <span className="panel-title">Saved Profiles ({fixtures.profiles.length})</span>
            <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }} onClick={fixtures.loadProfiles}>↺ Reload</button>
          </div>
          {fixtures.profiles.length === 0 ? (
            <div className="patch-empty">No profiles saved yet.</div>
          ) : (
            <div className="profile-list">
              {fixtures.profiles.map((p: any) => (
                <div key={p.key} className="profile-list-item">
                  <div className="profile-list-info">
                    <span className="profile-list-name">{p.profile.manufacturer} {p.profile.model}</span>
                    <span className="profile-list-sub">{p.profile.mode} · {p.profile.channels.length} ch</span>
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.7rem', color: 'var(--status-error)' }}
                    onClick={() => fixtures.deleteProfile(p.key)}
                    title="Delete profile"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
