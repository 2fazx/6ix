/// <reference types="vite/client" />
import type { SixApi } from '../preload'

declare global {
  interface Window {
    six: SixApi
  }
}

export {}