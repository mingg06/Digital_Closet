import { createContext } from 'react'

export type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PwaContext = createContext<{
  installed: boolean
  prompt: InstallPrompt | null
  install: () => Promise<void>
} | null>(null)
