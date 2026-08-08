import type { EffectsEngine } from '../effectsEngine'
import type { FxConfig } from '../fxTypes'
import { handle } from './ipcUtils'

export function registerFxIpc(fx: EffectsEngine): void {
  handle('fx:addEffect',    (cfg) => ({ id: fx.addEffect(cfg as FxConfig) }))
  handle('fx:removeEffect', (id)  => { fx.removeEffect(id as string) })
  handle('fx:clearAll',     ()    => { fx.clearAll() })
  handle('fx:getEffects',   ()    => ({ effects: fx.getEffects() }))
}
