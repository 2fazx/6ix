import { BrowserWindow } from 'electron'
import { createHash, randomBytes } from 'node:crypto'
import { jsonFetch } from './http'
import { log } from '../logger'
import type { MsAuthProgress } from '@shared/types'

const CLIENT_ID = '00000000402b5328'
const REDIRECT_URI = 'https://login.live.com/oauth20_desktop.srf'
const SCOPE = 'XboxLive.signin offline_access'

const AUTH_URL = 'https://login.live.com/oauth20_authorize.srf'
const TOKEN_URL = 'https://login.live.com/oauth20_token.srf'
const XBL_URL = 'https://user.auth.xboxlive.com/user/authenticate'
const XSTS_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'
const MC_LOGIN_URL = 'https://api.minecraftservices.com/authentication/login_with_xbox'
const MC_ENTITLEMENT_URL = 'https://api.minecraftservices.com/entitlements/mcstore'
const MC_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile'

export interface MsResult {
  username: string
  uuid: string
  xuid: string
  skinUrl: string | null
  accessToken: string
  refreshToken: string
  expiresAt: number
}

interface TokenResponse { access_token: string; refresh_token: string; expires_in: number }
interface XblResponse { Token: string; DisplayClaims: { xui: { uhs: string; xid: string }[] } }
interface McProfileResponse { id: string; name: string; skins?: { url: string; state: 'ACTIVE' | 'INACTIVE' }[] }
interface McEntitlementResponse { items: { name: string }[] }

const b64url = (buf: Buffer): string => buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

const pkce = () => {
  const verifier = b64url(randomBytes(32))
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  const state = b64url(randomBytes(16))
  return { verifier, challenge, state }
}

export async function loginMicrosoft(onProgress?: (p: MsAuthProgress) => void): Promise<MsResult> {
  const { verifier, challenge, state } = pkce()
  const params = new URLSearchParams({
    client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI,
    scope: SCOPE, state, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account'
  })

  onProgress?.({ stage: 'waiting-for-user', message: 'Waiting for Microsoft sign-in…' })
  const code = await captureAuthCode(`${AUTH_URL}?${params.toString()}`, state)
  if (!code) throw new Error('Sign-in was cancelled.')

  onProgress?.({ stage: 'exchanging-code', message: 'Exchanging authorization code…' })
  const tokenBody = new URLSearchParams({
    client_id: CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier, scope: SCOPE
  })
  const tokens = await jsonFetch<TokenResponse>(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenBody.toString()
  })

  onProgress?.({ stage: 'xbox-live', message: 'Signing into Xbox Live…' })
  const xbl = await xblAuthenticate(tokens.access_token)

  onProgress?.({ stage: 'xsts', message: 'Authorizing XSTS token…' })
  const xsts = await xstsAuthorize(xbl.Token)
  const xuid = xsts.DisplayClaims.xui[0].xid

  onProgress?.({ stage: 'minecraft', message: 'Signing into Minecraft services…' })
  const mcToken = await minecraftLogin(xsts.Token, xsts.DisplayClaims.xui[0].uhs)
  const expiresAt = Date.now() + (mcToken.expires_in - 60) * 1000

  onProgress?.({ stage: 'entitlement', message: 'Verifying game ownership…' })
  const entitled = await checkEntitlement(mcToken.access_token)
  if (!entitled) throw new Error('This Microsoft account does not own Minecraft: Java Edition.')

  onProgress?.({ stage: 'profile', message: 'Fetching Minecraft profile…' })
  const profile = await fetchProfile(mcToken.access_token)

  onProgress?.({ stage: 'done', message: 'Signed in.' })
  const activeSkin = profile.skins?.find(s => s.state === 'ACTIVE')?.url ?? null

  return {
    username: profile.name, uuid: formatUuid(profile.id), xuid, skinUrl: activeSkin,
    accessToken: mcToken.access_token, refreshToken: tokens.refresh_token, expiresAt
  }
}

export async function refreshMicrosoft(msRefreshToken: string): Promise<MsResult> {
  const body = new URLSearchParams({
    client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: msRefreshToken, redirect_uri: REDIRECT_URI, scope: SCOPE
  })
  const tokens = await jsonFetch<TokenResponse>(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString()
  })
  const xbl = await xblAuthenticate(tokens.access_token)
  const xsts = await xstsAuthorize(xbl.Token)
  const xuid = xsts.DisplayClaims.xui[0].xid
  const mcToken = await minecraftLogin(xsts.Token, xsts.DisplayClaims.xui[0].uhs)
  const profile = await fetchProfile(mcToken.access_token)
  const expiresAt = Date.now() + (mcToken.expires_in - 60) * 1000
  const activeSkin = profile.skins?.find(s => s.state === 'ACTIVE')?.url ?? null

  return {
    username: profile.name, uuid: formatUuid(profile.id), xuid, skinUrl: activeSkin,
    accessToken: mcToken.access_token, refreshToken: tokens.refresh_token, expiresAt
  }
}

function captureAuthCode(authUrl: string, expectedState: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 520, height: 720, title: 'Sign in with Microsoft', backgroundColor: '#08080a',
      autoHideMenuBar: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, partition: `ms-auth-${Date.now()}` }
    })
    let settled = false
    const finish = (code: string | null, err?: Error) => {
      if (settled) return
      settled = true
      if (!win.isDestroyed()) win.close()
      if (err) reject(err)
      else resolve(code)
    }
    const checkUrl = (url: string) => {
      if (!url.includes('oauth20_desktop.srf')) return false
      try {
        const parsed = new URL(url)
        const code = parsed.searchParams.get('code')
        const returnedState = parsed.searchParams.get('state')
        const error = parsed.searchParams.get('error')
        if (error) { finish(null, new Error(parsed.searchParams.get('error_description') ?? error)); return true }
        if (!code) return false
        if (returnedState && returnedState !== expectedState) { finish(null, new Error('OAuth state mismatch — sign-in aborted.')); return true }
        finish(code); return true
      } catch { return false }
    }
    win.webContents.on('will-navigate', (e, url) => { if (checkUrl(url)) e.preventDefault() })
    win.webContents.on('will-redirect', (e, url) => { if (checkUrl(url)) e.preventDefault() })
    win.webContents.on('did-navigate', (_e, url) => checkUrl(url))
    win.webContents.on('did-redirect-navigation', (_e, url) => checkUrl(url))
    win.on('closed', () => { if (!settled) { settled = true; reject(new Error('Sign-in window was closed.')) } })
    win.loadURL(authUrl).catch(err => finish(null, err))
  })
}

async function xblAuthenticate(msAccessToken: string): Promise<XblResponse> {
  return jsonFetch<XblResponse>(XBL_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: `d=${msAccessToken}` },
      RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT'
    })
  })
}

async function xstsAuthorize(xblToken: string): Promise<XblResponse> {
  const res = await fetch(XSTS_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ Properties: { SandboxId: 'RETAIL', UserTokens: [xblToken] }, RelyingParty: 'rp://api.minecraftservices.com/', TokenType: 'JWT' })
  })
  if (res.status === 401) {
    const data = (await res.json().catch(() => ({}))) as { XErr?: number }
    const xerr = data.XErr
    if (xerr === 2148916233) throw new Error('This Microsoft account has no Xbox profile. Create one at xbox.com.')
    if (xerr === 2148916235) throw new Error('Xbox Live is not available in this region.')
    if (xerr === 2148916238) throw new Error('This is a child account. An adult must add it to a Microsoft family group.')
    throw new Error(`XSTS authorization failed${xerr ? ` (XErr ${xerr})` : ''}.`)
  }
  if (!res.ok) throw new Error(`XSTS authorization failed: HTTP ${res.status}`)
  return (await res.json()) as XblResponse
}

interface McTokenResponse { access_token: string; expires_in: number; username: string }

async function minecraftLogin(xstsToken: string, uhs: string): Promise<McTokenResponse> {
  return jsonFetch<McTokenResponse>(MC_LOGIN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identityToken: `XBL3.0 x=${uhs};${xstsToken}` })
  })
}

async function checkEntitlement(mcAccessToken: string): Promise<boolean> {
  try {
    const data = await jsonFetch<McEntitlementResponse>(MC_ENTITLEMENT_URL, { headers: { Authorization: `Bearer ${mcAccessToken}` } })
    return data.items.some(i => i.name === 'product_minecraft' || i.name === 'game_minecraft')
  } catch (e) {
    log.warn('entitlement check failed', String(e))
    return false
  }
}

async function fetchProfile(mcAccessToken: string): Promise<McProfileResponse> {
  return jsonFetch<McProfileResponse>(MC_PROFILE_URL, { headers: { Authorization: `Bearer ${mcAccessToken}` } })
}

const formatUuid = (raw: string): string => {
  const h = raw.replace(/-/g, '')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}