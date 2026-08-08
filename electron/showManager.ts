import { app, dialog } from 'electron'
import { promises as fs, rmSync } from 'fs'
import { join } from 'path'
import AdmZip from 'adm-zip'

export class ShowManager {
  private appDir = ''

  initialize(): void {
    const docPath = app.getPath('documents')
    this.appDir = join(docPath, 'DmxMaster')
  }

  async exportShow(): Promise<{ success: boolean; error?: string }> {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export DMX Master Show',
        defaultPath: 'MyShow.dmxshow',
        filters: [{ name: 'DMX Show', extensions: ['dmxshow'] }]
      })

      if (canceled || !filePath) return { success: false }

      // Create a zip of the entire DmxMaster directory
      const zip = new AdmZip()
      zip.addLocalFolder(this.appDir)
      
      zip.writeZip(filePath)
      console.log(`[ShowManager] Exported show to ${filePath}`)
      
      return { success: true }
    } catch (e: any) {
      console.error('[ShowManager] Export error:', e)
      return { success: false, error: e.message }
    }
  }

  async importShow(): Promise<{ success: boolean; error?: string }> {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import DMX Master Show',
        filters: [{ name: 'DMX Show', extensions: ['dmxshow'] }],
        properties: ['openFile']
      })

      if (canceled || filePaths.length === 0) return { success: false }

      const filePath = filePaths[0]

      // Confirm destructive action
      const { response } = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Cancel', 'Import & Restart'],
        title: 'Confirm Import',
        message: 'Importing a show will overwrite your current configuration.',
        detail: 'The application will restart immediately after importing. Are you sure you want to proceed?'
      })

      if (response === 0) return { success: false } // Cancelled

      // Extract
      const zip = new AdmZip(filePath)
      zip.extractAllTo(this.appDir, true) // true = overwrite

      console.log(`[ShowManager] Imported show from ${filePath}`)
      
      // Relaunch the app to safely load all the new singletons from disk
      app.relaunch()
      app.exit(0)

      return { success: true }
    } catch (e: any) {
      console.error('[ShowManager] Import error:', e)
      return { success: false, error: e.message }
    }
  }

  async newShow(): Promise<{ success: boolean; error?: string }> {
    try {
      // Confirm destructive action
      const { response } = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Cancel', 'Erase & Restart'],
        title: 'New Show',
        message: 'This will erase all patches, scenes, groups, and timelines.',
        detail: 'The application will restart immediately. Are you sure you want to proceed?'
      })

      if (response === 0) return { success: false } // Cancelled

      // Delete everything inside DmxMaster EXCEPT the Profiles directory (to save users from re-importing profiles)
      const files = await fs.readdir(this.appDir, { withFileTypes: true })
      
      for (const file of files) {
        if (file.name === 'Profiles') continue
        const fullPath = join(this.appDir, file.name)
        rmSync(fullPath, { recursive: true, force: true })
      }

      console.log(`[ShowManager] Created New Show. Relaunching...`)
      
      app.relaunch()
      app.exit(0)

      return { success: true }
    } catch (e: any) {
      console.error('[ShowManager] New Show error:', e)
      return { success: false, error: e.message }
    }
  }
}
