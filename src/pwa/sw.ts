/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  matchPrecache,
  precacheAndRoute,
} from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
}

// Only the build's explicit static-asset allowlist enters Cache Storage.
precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [],
  directoryIndex: '',
  cleanURLs: false,
})
cleanupOutdatedCaches()
clientsClaim()

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' && url.origin === self.location.origin,
  async ({ request }) => {
    try {
      // Never retain OAuth callbacks, share URLs, or navigation responses.
      return await fetch(request, { cache: 'no-store' })
    } catch {
      return (await matchPrecache('/offline.html')) ?? Response.error()
    }
  },
)
