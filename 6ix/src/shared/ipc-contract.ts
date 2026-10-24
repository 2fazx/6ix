export const IPC = {
  instancesList: 'instances:list',
  instancesGet: 'instances:get',
  instancesCreate: 'instances:create',
  instancesUpdate: 'instances:update',
  instancesDelete: 'instances:delete',
  instancesRename: 'instances:rename',

  accountsList: 'accounts:list',
  accountsCreateOffline: 'accounts:create-offline',
  accountsMsLogin: 'accounts:ms-login',
  accountsDelete: 'accounts:delete',

  profilesList: 'profiles:list',
  profilesCreate: 'profiles:create',
  profilesDelete: 'profiles:delete',
  profilesAttach: 'profiles:attach',

  mcVersionsList: 'mc:versions:list',
  mcVersionStatus: 'mc:version-status',

  modrinthSearch: 'modrinth:search',
  modrinthVersions: 'modrinth:versions',
  modrinthInstall: 'modrinth:install',

  modsList: 'mods:list',
  modsToggle: 'mods:toggle',
  modsDelete: 'mods:delete',
  modsImport: 'mods:import',
  modsSaveMeta: 'mods:save-meta',

  filesOpenFolder: 'files:open-folder',
  filesReadLog: 'files:read-log',

  settingsGet: 'settings:get',
  settingsSet: 'settings:set',

  launchStart: 'launch:start',
  launchKill: 'launch:kill',
  launchStatus: 'launch:status',

  downloadProgressEvent: 'download:progress',
  msAuthProgressEvent: 'ms-auth:progress',
  installProgressEvent: 'install:progress',
  launchLogEvent: 'launch:log',
  launchExitEvent: 'launch:exit'
} as const