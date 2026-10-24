import { app } from 'electron'
import { join } from 'node:path'

export const PATHS = {
  data: () => app.getPath('userData'),
  db: () => join(app.getPath('userData'), '6ix.db'),
  instances: () => join(app.getPath('userData'), 'instances'),
  profiles: () => join(app.getPath('userData'), 'profiles'),
  cache: () => join(app.getPath('userData'), 'cache'),
  logs: () => join(app.getPath('userData'), 'logs')
}