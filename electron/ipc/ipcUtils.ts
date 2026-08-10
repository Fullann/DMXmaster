import { ipcMain } from 'electron'

export function handle(channel: string, fn: (...args: any[]) => Promise<any> | any) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      const data = await fn(...args)
      return { success: true, ...(data !== undefined ? (typeof data === 'object' && !Array.isArray(data) ? data : { data }) : {}) }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[IPC] ${channel} error:`, message)
      return { success: false, error: message }
    }
  })
}
