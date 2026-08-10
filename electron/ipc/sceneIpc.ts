import type { SceneManager } from '../sceneManager'
import type { ParameterGroup } from '../sceneTypes'
import { handle } from './ipcUtils'

export function registerSceneIpc(scene: SceneManager): void {
  handle('scene:getScenes', () => ({ scenes: scene.getScenes() }))

  handle('scene:getScene', (id) => {
    const s = scene.getScene(id as string)
    if (!s) throw new Error(`Scene not found: ${id}`)
    return { scene: s }
  })

  handle('scene:saveCurrentAsScene', async (name, fadeTimeMs, filterMask, includeFx) => {
    const s = await scene.saveCurrentAsScene(
      name as string,
      fadeTimeMs as number,
      (filterMask as ParameterGroup | undefined) ?? 'all',
      includeFx as boolean,
    )
    return { scene: s }
  })

  handle('scene:recallScene', (id) => {
    scene.recallScene(id as string)
  })

  handle('scene:deleteScene', async (id) => {
    await scene.deleteScene(id as string)
  })

  handle('scene:cancelFade', () => {
    scene.cancelFade()
  })

  handle('scene:getFadeStatus', () => ({ status: scene.getFadeStatus() }))
}
