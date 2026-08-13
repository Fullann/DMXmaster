import type { DmxEngine }      from '../dmxEngine'
import type { SerialManager }  from '../serialManager'
import type { FixtureManager } from '../fixtureManager'
import type { SceneManager }   from '../sceneManager'
import type { ChaserManager }  from '../chaserManager'
import type { EffectsEngine }  from '../effectsEngine'
import type { LiveGridManager } from '../liveGridManager'
import type { AudioEngine }    from '../audioEngine'
import type { NetworkManager } from '../networkManager'
import type { PixelEngine }    from '../pixelEngine'
import type { TimelineManager} from '../timelineManager'
import type { ShowManager }    from '../showManager'
import type { PaletteManager } from '../paletteManager'
import type { VirtualConsoleManager } from '../virtualConsoleManager'

import { registerSerialIpc }   from './serialIpc'
import { registerDmxIpc }      from './dmxIpc'
import { registerFixtureIpc }  from './fixtureIpc'
import { registerSceneIpc }    from './sceneIpc'
import { registerChaserIpc }   from './chaserIpc'
import { registerFxIpc }       from './fxIpc'
import { registerGridIpc }     from './gridIpc'
import { registerAudioIpc }    from './audioIpc'
import { registerNetworkIpc }  from './networkIpc'
import { registerPixelIpc }    from './pixelIpc'
import { registerTimelineIpc } from './timelineIpc'
import { registerShowIpc }     from './showIpc'
import { registerPaletteHandlers }  from './paletteIpc'
import { registerVirtualConsoleIpc } from './virtualConsoleIpc'

export { pushUniverseUpdate } from './dmxIpc'

export function registerIpcHandlers(
  engine:  DmxEngine,
  serial:  SerialManager,
  fixture: FixtureManager,
  scene:   SceneManager,
  chaser:  ChaserManager,
  fx:      EffectsEngine,
  grid:    LiveGridManager,
  audio:   AudioEngine,
  network: NetworkManager,
  pixel:   PixelEngine,
  timeline:TimelineManager,
  show:    ShowManager,
  palette: PaletteManager,
  virtualConsole: VirtualConsoleManager
): void {
  registerSerialIpc(serial)
  registerDmxIpc(engine, fixture)
  registerFixtureIpc(fixture)
  registerSceneIpc(scene)
  registerChaserIpc(chaser)
  registerFxIpc(fx)
  registerGridIpc(grid)
  registerAudioIpc(audio)
  registerNetworkIpc(network)
  registerPixelIpc(pixel)
  registerTimelineIpc(timeline)
  registerShowIpc(show)
  registerPaletteHandlers(palette)
  registerVirtualConsoleIpc(virtualConsole)

  console.log('[IPC] All modular handlers registered.')
}
