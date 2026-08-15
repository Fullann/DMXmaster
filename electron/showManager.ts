import { app, dialog } from 'electron'
import { promises as fs, rmSync } from 'fs'
import { join, basename } from 'path'
import AdmZip from 'adm-zip'

export interface RecentShow {
  name: string
  path: string
  lastOpened: number
}

export class ShowManager {
  private appDir = ''
  private userDataDir = ''
  private recentShowsPath = ''
  private lockFilePath = ''
  private autoSavePath = ''
  private autoSaveTimer: NodeJS.Timeout | null = null

  initialize(): void {
    const docPath = app.getPath('documents')
    this.appDir = join(docPath, 'DmxMaster')
    this.userDataDir = app.getPath('userData')
    this.recentShowsPath = join(this.userDataDir, 'recent_shows.json')
    this.lockFilePath = join(this.appDir, '.lock')
    this.autoSavePath = join(this.userDataDir, 'AutoSave.dmxshow')
  }

  async checkCrashRecovery(): Promise<void> {
    try {
      // 1. Ensure appDir exists so we don't throw checking for .lock
      try { await fs.access(this.appDir) } catch { return }

      // 2. Check if .lock exists
      try {
        await fs.access(this.lockFilePath)
      } catch {
        // Normal startup: Create .lock file
        await fs.writeFile(this.lockFilePath, Date.now().toString())
        return
      }

      // 3. Lock exists. Check if we have an AutoSave file
      try {
        await fs.access(this.autoSavePath)
      } catch {
        // No auto-save found. Just overwrite lock and continue.
        await fs.writeFile(this.lockFilePath, Date.now().toString())
        return
      }

      // 4. Prompt user synchronously using dialog.showMessageBoxSync
      const response = dialog.showMessageBoxSync({
        type: 'error',
        buttons: ['Discard', 'Restore Backup'],
        defaultId: 1,
        title: 'Crash Detected',
        message: 'DMX Master closed unexpectedly during your last session.',
        detail: 'An auto-save backup is available. Do you want to restore it? This will overwrite your current corrupted state.'
      })

      if (response === 1) {
        // Restore Backup
        console.log('[ShowManager] Restoring auto-save backup...')
        const zip = new AdmZip(this.autoSavePath)
        zip.extractAllTo(this.appDir, true)
      }

      // Rewrite lock for the current session
      await fs.writeFile(this.lockFilePath, Date.now().toString())

    } catch (e) {
      console.error('[ShowManager] Error checking crash recovery:', e)
    }
  }

  shutdown(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
    try {
      rmSync(this.lockFilePath, { force: true })
      console.log('[ShowManager] Removed .lock file (clean shutdown).')
    } catch (e) {
      console.error('[ShowManager] Failed to remove .lock file:', e)
    }
  }

  startAutoSave(intervalMs: number, engine?: import('./dmxEngine').DmxEngine): void {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer)
    
    this.autoSaveTimer = setInterval(async () => {
      try {
        console.log('[ShowManager] Running background auto-save...')
        
        // 1. Save live programmer state if engine is provided
        if (engine) {
          await engine.saveProgrammerState()
        }

        // 2. Create the Backups directory if it doesn't exist
        const backupsDir = join(this.appDir, 'Backups')
        try { await fs.mkdir(backupsDir, { recursive: true }) } catch {}

        // 3. Create the new auto-save zip
        const now = new Date()
        const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0]
        const backupName = `AutoSave_${timestamp}.dmxshow`
        const backupPath = join(backupsDir, backupName)
        
        const zip = new AdmZip()
        // Add everything except the Backups folder to avoid recursion
        const files = await fs.readdir(this.appDir, { withFileTypes: true })
        for (const file of files) {
          if (file.name === 'Backups') continue
          const fullPath = join(this.appDir, file.name)
          if (file.isDirectory()) {
            await zip.addLocalFolderPromise(fullPath, { zipPath: file.name })
          } else {
            zip.addLocalFile(fullPath)
          }
        }
        await zip.writeZipPromise(backupPath)
        
        // Also overwrite the main AutoSave.dmxshow for the crash recovery popup
        await zip.writeZipPromise(this.autoSavePath)

        // 4. Rotate old backups (keep max 20)
        const maxBackups = 20
        const backupFiles = await fs.readdir(backupsDir)
        const validBackups = backupFiles.filter(f => f.startsWith('AutoSave_') && f.endsWith('.dmxshow'))
        validBackups.sort()

        if (validBackups.length > maxBackups) {
          const toDelete = validBackups.slice(0, validBackups.length - maxBackups)
          for (const oldBackup of toDelete) {
            await fs.rm(join(backupsDir, oldBackup), { force: true })
            console.log(`[ShowManager] Deleted old backup: ${oldBackup}`)
          }
        }
        
        // 5. Notify the UI
        import('electron').then(({ BrowserWindow }) => {
          BrowserWindow.getAllWindows().forEach(w => w.webContents.send('backup:complete', Date.now()))
        })

      } catch (e) {
        console.error('[ShowManager] Auto-save failed:', e)
      }
    }, intervalMs)
    
    // Don't keep the event loop alive just for the autosave timer
    this.autoSaveTimer.unref()
  }

  private async loadRecentShows(): Promise<RecentShow[]> {
    try {
      const data = await fs.readFile(this.recentShowsPath, 'utf-8')
      return JSON.parse(data) as RecentShow[]
    } catch {
      return []
    }
  }

  private async saveRecentShow(filePath: string): Promise<void> {
    try {
      let shows = await this.loadRecentShows()
      const name = basename(filePath, '.dmxshow')
      
      shows = shows.filter(s => s.path !== filePath)
      shows.unshift({
        name,
        path: filePath,
        lastOpened: Date.now()
      })
      shows = shows.slice(0, 10)
      
      await fs.writeFile(this.recentShowsPath, JSON.stringify(shows, null, 2))
    } catch (e) {
      console.error('[ShowManager] Failed to save recent show', e)
    }
  }

  async getRecentShows(): Promise<{ success: boolean; shows?: RecentShow[]; error?: string }> {
    try {
      const shows = await this.loadRecentShows()
      return { success: true, shows }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  }

  async openRecentShow(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      try {
        await fs.access(filePath)
      } catch {
        return { success: false, error: 'File not found on disk.' }
      }

      const { response } = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Cancel', 'Open & Restart'],
        title: 'Confirm Open',
        message: 'Opening a show will overwrite your current configuration.',
        detail: 'The application will restart immediately after opening. Are you sure you want to proceed?'
      })

      if (response === 0) return { success: false }

      const zip = new AdmZip(filePath)
      zip.extractAllTo(this.appDir, true)

      await this.saveRecentShow(filePath)
      console.log(`[ShowManager] Opened recent show from ${filePath}`)
      
      app.relaunch()
      app.exit(0)

      return { success: true }
    } catch (e: any) {
      console.error('[ShowManager] Open recent error:', e)
      return { success: false, error: e.message }
    }
  }

  async exportShow(): Promise<{ success: boolean; error?: string }> {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export DMX Master Show',
        defaultPath: 'MyShow.dmxshow',
        filters: [{ name: 'DMX Show', extensions: ['dmxshow'] }]
      })

      if (canceled || !filePath) return { success: false }

      // Create a zip of the entire DmxMaster directory asynchronously
      const zip = new AdmZip()
      await zip.addLocalFolderPromise(this.appDir, {})
      await zip.writeZipPromise(filePath)

      await this.saveRecentShow(filePath)
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

      await this.saveRecentShow(filePath)
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
