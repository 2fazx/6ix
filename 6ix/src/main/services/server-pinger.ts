export interface ServerStatus {
  online: boolean
  players?: { online: number; max: number }
  version?: string
  motd?: string
  icon?: string
  ping?: number
}

export async function pingServer(host: string, port: number = 25565): Promise<ServerStatus> {
  const start = Date.now()
  try {
    // Use mcsrvstat.us API, which handles SRV records and anti-bot bypass automatically
    const res = await fetch(`https://api.mcsrvstat.us/3/${host}`)
    if (!res.ok) throw new Error('API error')
    
    const data = await res.json()

    if (!data.online) {
      return { online: false }
    }

    // The API returns the icon as a base64 string WITHOUT the data URI prefix
    let icon = data.icon
    if (icon && !icon.startsWith('data:image')) {
      icon = `data:image/png;base64,${icon}`
    }

    // Clean up MOTD (remove minecraft color codes like §c)
    const cleanMotd = (text: string) => text.replace(/§[0-9a-fk-or]/g, '')

    return {
      online: true,
      players: { 
        online: data.players?.online || 0, 
        max: data.players?.max || 0 
      },
      version: data.version || 'Unknown',
      motd: data.motd?.clean?.join(' ') || cleanMotd(data.motd?.raw?.join(' ') || ''),
      icon,
      ping: Date.now() - start
    }
  } catch (error) {
    return { online: false }
  }
}