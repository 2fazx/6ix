export const api = (window as any).six || {
  accounts: { list: () => Promise.resolve([]) },
  instances: { list: () => Promise.resolve([]) },
  modrinth: { search: () => Promise.resolve({ hits: [] }) },
  launch: { onLog: () => () => {}, onExit: () => () => {}, onDownloadProgress: () => () => {}, onMsAuthProgress: () => () => {} },
  downloads: { list: () => Promise.resolve([]), onUpdate: () => () => {} }
}