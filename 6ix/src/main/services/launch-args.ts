import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getFreshAccessToken } from './accounts'
import { getJavaPath } from './java-manager'
import { matchesRules, type VersionJson, type LibraryRule, type InstalledVersion } from './version-installer'
import { log } from '../logger'
import type { Instance } from '@shared/types'

interface ArgEntry {
  rules?: LibraryRule[]
  value: string | string[]
}

export interface LaunchCommand {
  java: string
  args: string[]
  cwd: string
}

export async function buildLaunchArgs(instance: Instance, installed: InstalledVersion): Promise<LaunchCommand> {
  if (!instance) throw new Error('Instance data is missing.')

  let auth: { username: string; uuid: string; xuid: string; accessToken: string; userType: 'legacy' | 'msa' } = { 
    username: 'Player', uuid: '00000000000000000000000000000000', xuid: '0', accessToken: '0', userType: 'legacy' 
  }

  if (instance.accountId) {
    auth = await getFreshAccessToken(instance.accountId)
  }

  // FIX 1: If xuid is missing, decode the JWT token to extract it
  if (auth.accessToken !== '0' && (!auth.xuid || auth.xuid === 'undefined' || auth.xuid === '0')) {
    try {
      const payload = JSON.parse(Buffer.from(auth.accessToken.split('.')[1], 'base64').toString())
      if (payload.xuid) auth.xuid = String(payload.xuid)
      else if (payload.xid) auth.xuid = String(payload.xid)
    } catch (e) {
      log.warn('failed to parse xuid from token', String(e))
    }
  }

  const versionJson = JSON.parse(await readFile(installed.versionJsonPath, 'utf8')) as VersionJson
  const features = new Set<string>()

  const classpathSet = new Map<string, string>()

  for (const lib of versionJson.libraries) {
    if (!matchesRules(lib.rules, features)) continue
    if (lib.natives) continue
    if (/:natives-/.test(lib.name)) continue
    if (lib.downloads?.artifact) {
      const [group, artifact] = lib.name.split(':')
      classpathSet.set(`${group}:${artifact}`, join(installed.librariesDir, lib.downloads.artifact.path))
    }
  }

  if (instance.loader === 'fabric') {
    const loaders = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${instance.minecraftVersion}`).then(r => r.json())
    const loaderVer = instance.loaderVersion || loaders.find((l: any) => l.loader.stable)?.loader.version || loaders[0].loader.version
    const fabricJson = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${instance.minecraftVersion}/${loaderVer}/profile/json`).then(r => r.json())
    
    for (const lib of fabricJson.libraries) {
      if (!matchesRules(lib.rules, features)) continue
      const [group, artifact, version] = lib.name.split(':')
      const path = `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}.jar`
      classpathSet.set(`${group}:${artifact}`, join(installed.librariesDir, path))
    }
  }

  const cp = [installed.clientJar, ...classpathSet.values()]
  const classpath = cp.join(process.platform === 'win32' ? ';' : ':')

  const substitutions: Record<string, string> = {
    auth_player_name: auth.username,
    version_name: versionJson.id,
    game_directory: instance.directory,
    assets_root: installed.assetsDir,
    assets_index_name: versionJson.assetIndex?.id ?? versionJson.assets ?? 'legacy',
    auth_uuid: auth.uuid.replace(/-/g, ''),
    auth_access_token: auth.accessToken,
    auth_session: `token:${auth.accessToken}:${auth.uuid.replace(/-/g, '')}`,
    user_type: auth.userType,
    version_type: versionJson.type,
    natives_directory: installed.nativesDir,
    launcher_name: '6IX',
    launcher_version: '0.1.0',
    classpath,
    resolution_width: '854',
    resolution_height: '480',
    clientid: '00000000402b5328',
    auth_xuid: auth.xuid
  }

  const subst = (s: string) => s.replace(/\$\{([^}]+)\}/g, (_, k: string) => substitutions[k] ?? '')

  let jvmArgs: string[] = [`-Xms${instance.ramMinMb}M`, `-Xmx${instance.ramMaxMb}M`]
  if (versionJson.arguments?.jvm) {
    jvmArgs.push(...expandArgBlock(versionJson.arguments.jvm, features, subst))
  } else {
    jvmArgs.push('-Djava.library.path=' + installed.nativesDir)
    jvmArgs.push('-cp', classpath)
  }
  if (installed.logConfigPath && installed.logConfigArg) {
    jvmArgs.push(installed.logConfigArg.replace('${path}', installed.logConfigPath))
  }
  if (instance.jvmArgs) jvmArgs.push(...splitArgs(instance.jvmArgs))
  jvmArgs = jvmArgs.filter(arg => !arg.startsWith('--sun-misc-unsafe-memory-access'))

  let gameArgs: string[] = []
  if (versionJson.arguments?.game) {
    gameArgs = expandArgBlock(versionJson.arguments.game, features, subst)
  } else if (versionJson.minecraftArguments) {
    gameArgs = splitArgs(subst(versionJson.minecraftArguments))
  }
  
  const removeArg = (args: string[], flag: string) => {
    let idx = args.indexOf(flag)
    while (idx !== -1) {
      args.splice(idx, 1)
      // Only remove the value if it doesn't start with '--'
      if (idx < args.length && !args[idx].startsWith('--')) {
         args.splice(idx, 1)
      }
      idx = args.indexOf(flag)
    }
  }
  
  // FIX 2: Strip --demo entirely, it forces the game into demo mode
  removeArg(gameArgs, '--demo')
  
  removeArg(gameArgs, '--accessToken')
  removeArg(gameArgs, '--uuid')
  removeArg(gameArgs, '--username')
  removeArg(gameArgs, '--userType')
  removeArg(gameArgs, '--clientId')
  removeArg(gameArgs, '--xuid')
  removeArg(gameArgs, '--userProperties')
  removeArg(gameArgs, '--profileProperties')

  gameArgs.push('--accessToken', auth.accessToken)
  gameArgs.push('--uuid', auth.uuid.replace(/-/g, ''))
  gameArgs.push('--username', auth.username)
  gameArgs.push('--userType', auth.userType)
  gameArgs.push('--clientId', '00000000402b5328')
  gameArgs.push('--xuid', auth.xuid)
  gameArgs.push('--userProperties', '{}')
  gameArgs.push('--profileProperties', '{}')

  if (instance.gameArgs) gameArgs.push(...splitArgs(instance.gameArgs))

  let finalJavaPath = instance.javaPath
  if (!finalJavaPath) {
    try {
      finalJavaPath = await getJavaPath(versionJson.javaVersion?.majorVersion ?? 21)
    } catch (e) {
      log.error('auto-java failed', String(e))
      finalJavaPath = 'java'
    }
  }

  console.log('[6IX] FIXED GAME ARGS:', gameArgs)

  return {
    java: finalJavaPath,
    args: [...jvmArgs, installed.mainClass, ...gameArgs],
    cwd: instance.directory
  }
}

function expandArgBlock(block: (string | ArgEntry)[], features: Set<string>, subst: (s: string) => string): string[] {
  const out: string[] = []
  for (const entry of block) {
    if (typeof entry === 'string') { out.push(subst(entry)); continue }
    if (!matchesRules(entry.rules, features)) continue
    if (Array.isArray(entry.value)) { for (const v of entry.value) out.push(subst(v)) } 
    else { out.push(subst(entry.value)) }
  }
  return out
}

const splitArgs = (s: string): string[] =>
  s.match(/"[^"]*"|\S+/g)?.map(a => a.replace(/^"|"$/g, '')) ?? []