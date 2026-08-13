export type WidgetType = 'button' | 'fader'
export type WidgetTargetType = 'scene' | 'chaser' | 'macro' | 'submaster' | 'grandmaster' | 'none'

export interface ConsoleWidget {
  id: string
  type: WidgetType
  x: number
  y: number
  width: number
  height: number
  label: string
  color: string
  targetType: WidgetTargetType
  targetId: string // The ID of the scene/chaser/group
}

export interface VirtualConsolePage {
  id: string
  name: string
  widgets: ConsoleWidget[]
}
