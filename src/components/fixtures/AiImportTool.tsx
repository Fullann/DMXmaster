import { useState, useCallback } from 'react'
import type { FixtureProfile } from '@/types/fixtures'
import { validateFixtureProfile } from '@/types/fixtures'
import { Lightbulb, AlertTriangle, CheckCircle2, FileJson, Copy } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// AiImportTool — paste JSON output from an LLM, validate, and save.
// ─────────────────────────────────────────────────────────────────────────────

interface AiImportToolProps {
  onSave: (profile: FixtureProfile) => Promise<void>
}

export function AiImportTool({ onSave }: AiImportToolProps) {
  const [jsonText,       setJsonText]       = useState('')
  const [validProfile,   setValidProfile]   = useState<FixtureProfile | null>(null)
  const [errors,         setErrors]         = useState<string[]>([])
  const [isSaving,       setIsSaving]       = useState(false)
  const [savedMessage,   setSavedMessage]   = useState<string | null>(null)

  // ── Validation ──────────────────────────────────────────────────────────────

  const handleValidate = useCallback(() => {
    setSavedMessage(null)
    setValidProfile(null)
    setErrors([])

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText.trim())
    } catch {
      setErrors(['Invalid JSON — check your brackets and quotes.'])
      return
    }

    const result = validateFixtureProfile(parsed)
    if (result.valid && result.profile) {
      setValidProfile(result.profile)
      setErrors([])
    } else {
      setErrors(result.errors)
    }
  }, [jsonText])

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!validProfile) return
    setIsSaving(true)
    await onSave(validProfile)
    setIsSaving(false)
    setSavedMessage(`✓ Saved: ${validProfile.manufacturer} ${validProfile.model} (${validProfile.mode})`)
    setJsonText('')
    setValidProfile(null)
  }, [validProfile, onSave])

  const hasJson = jsonText.trim().length > 0

  const handleCopyPrompt = async () => {
    const promptText = `Generate a DMX fixture profile JSON for the [BRAND] [MODEL] in [N]-channel mode. Use this schema: { manufacturer, model, mode, channels: [{ number, name, type, defaultValue }] }. Valid types: Intensity | Red | Green | Blue | White | Color | Pan | Tilt | Smoke | Shutter | Speed | Effect | Gobo | Prism | Zoom | Focus | Unknown`
    try {
      await navigator.clipboard.writeText(promptText)
      // Visual feedback handled by alert or we can just ignore it for simplicity
      // But alert is fine for now
      alert('Prompt copié !')
    } catch {
      alert('Erreur de copie.')
    }
  }

  return (
    <div className="ai-import-tool">
      <div className="fb-header">
        <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileJson size={16} /> AI Import
        </span>
        <span className="fb-hint">Paste JSON from ChatGPT, Claude, or any LLM</span>
      </div>

      {/* Prompt hint */}
      <div className="ai-prompt-hint">
        <span className="ai-prompt-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lightbulb size={14} /> Prompt template
          </div>
          <button className="btn-icon-sm" onClick={handleCopyPrompt} title="Copier le prompt">
            <Copy size={12} />
          </button>
        </span>
        <code className="ai-prompt-text">
          "Generate a DMX fixture profile JSON for the [BRAND] [MODEL] in
          [N]-channel mode. Use this schema: &#123; manufacturer, model, mode,
          channels: [&#123; number, name, type, defaultValue &#125;] &#125;.
          Valid types: Intensity | Red | Green | Blue | White | Color |
          Pan | Tilt | Smoke | Shutter | Speed | Effect"
        </code>
      </div>

      {/* JSON textarea */}
      <div className="form-group">
        <label className="form-label">Paste Profile JSON</label>
        <textarea
          className="styled-textarea"
          rows={10}
          placeholder={'{\n  "manufacturer": "Chauvet",\n  "model": "SlimPAR Pro H",\n  "mode": "6-channel",\n  "channels": [\n    { "number": 1, "name": "Red", "type": "Red", "defaultValue": 0 },\n    ...\n  ]\n}'}
          value={jsonText}
          onChange={e => { setJsonText(e.target.value); setValidProfile(null); setErrors([]) }}
          spellCheck={false}
        />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="validation-errors">
          <div className="ve-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={14} /> Validation failed ({errors.length} error{errors.length > 1 ? 's' : ''})
          </div>
          <ul className="ve-list">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Preview of valid profile */}
      {validProfile && (
        <div className="validation-success">
          <div className="vs-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> Valid Profile
          </div>
          <div className="vs-meta">
            <span><strong>{validProfile.manufacturer}</strong> {validProfile.model}</span>
            <span className="vs-badge">{validProfile.mode}</span>
            <span className="vs-badge">{validProfile.channels.length} ch</span>
          </div>
          <div className="vs-channels">
            {validProfile.channels.map((ch) => (
              <span key={ch.number} className="vs-channel-tag">
                {ch.number}. {ch.name} <em>({ch.type})</em>
              </span>
            ))}
          </div>
        </div>
      )}

      {savedMessage && (
        <div className="fb-success">{savedMessage}</div>
      )}

      {/* Actions */}
      <div className="fb-actions">
        <button
          className="btn btn-ghost"
          onClick={handleValidate}
          disabled={!hasJson}
        >
          Validate JSON
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!validProfile || isSaving}
        >
          {isSaving ? 'Saving…' : 'Validate & Save'}
        </button>
      </div>
    </div>
  )
}
