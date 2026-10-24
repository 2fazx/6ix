import { app, BrowserWindow, shell, protocol, net, Menu, ipcMain } from 'electron'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { autoUpdater } from 'electron-updater'
import { registerIpc } from './ipc'
import './db'
import { log } from './logger'

const isDev = !!process.env.ELECTRON_RENDERER_URL

protocol.registerSchemesAsPrivileged([
  { scheme: '6ix-media', privileges: { bypassCSP: true, standard: true, secure: true, supportFetchAPI: true } }
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#060508',
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.once('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) win.loadURL(process.env.ELECTRON_RENDERER_URL!)
  else win.loadFile(join(__dirname, '../renderer/index.html'))

  log.info('window created')
}

autoUpdater.on('update-available', () => {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) win.webContents.send('update:available')
  })
})

autoUpdater.on('update-downloaded', () => {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) win.webContents.send('update:downloaded')
  })
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)

  protocol.handle('6ix-media', (request) => {
    const url = request.url.replace('6ix-media://', '')
    return net.fetch(pathToFileURL(decodeURIComponent(url)).toString())
  })
  
  registerIpc()
  createWindow()

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})