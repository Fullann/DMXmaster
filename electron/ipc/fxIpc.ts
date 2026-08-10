import type { EffectsEngine } from '../effectsEngine'
import type { FxConfig } from '../fxTypes'
import { handle } from './ipcUtils'

export function registerFxIpc(fx: EffectsEngine): void {
  handle('fx:addEffect',    (cfg) => ({ id: fx.addEffect(cfg as FxConfig) }))
  handle('fx:updateEffect', (id: string, cfg: FxConfig) => { fx.updateEffect(id, cfg) })
  handle('fx:setPaused',    (id: string, paused: boolean) => { fx.setEffectPaused(id, paused) })
  handle('fx:removeEffect', (id: string)  => { fx.removeEffect(id) })
  handle('fx:clearAll',     ()    => { fx.clearAll() })
  handle('fx:getEffects',   ()    => ({ effects: fx.getEffects() }))
}
