import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

// Configure the profile before any settings modules or the single-instance lock.
// A development window must never receive launches of the installed application.
if (!app.isPackaged && process.env.NODE_ENV === 'development') {
  const developmentProfile = path.join(app.getPath('appData'), 'Cluegent-development')
  fs.mkdirSync(developmentProfile, { recursive: true })
  app.setPath('userData', developmentProfile)
}
