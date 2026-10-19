import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { PwaProvider } from './PwaProvider'
import { PwaSettings } from './PwaSettings'

const state = vi.hoisted(() => ({
  refresh: true,
  update: vi.fn(),
  dismiss: vi.fn(),
}))
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [state.refresh, state.dismiss],
    updateServiceWorker: state.update,
  }),
}))
beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({ matches: false }),
  })
})

it('waits for explicit reload approval and lets an update be dismissed', () => {
  render(
    <PwaProvider>
      <PwaSettings />
    </PwaProvider>,
  )
  expect(state.update).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Later' }))
  expect(state.dismiss).toHaveBeenCalledWith(false)
  expect(state.update).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Reload app' }))
  expect(state.update).toHaveBeenCalledWith(true)
})

it('offers browser installation only after an install event, then confirms installation', async () => {
  render(
    <PwaProvider>
      <PwaSettings />
    </PwaProvider>,
  )
  expect(
    screen.queryByRole('button', { name: 'Install Digital Closet' }),
  ).toBeNull()
  const prompt = vi.fn().mockResolvedValue(undefined)
  const event = new Event('beforeinstallprompt', { cancelable: true })
  Object.assign(event, {
    prompt,
    userChoice: Promise.resolve({ outcome: 'dismissed' }),
  })
  fireEvent(window, event)
  expect(event.defaultPrevented).toBe(true)
  fireEvent.click(
    screen.getByRole('button', { name: 'Install Digital Closet' }),
  )
  expect(prompt).toHaveBeenCalledOnce()
  expect(await screen.findByText(/On iPhone/)).toBeVisible()
  fireEvent(window, new Event('appinstalled'))
  expect(
    screen.getByText('Digital Closet is installed on this device.'),
  ).toBeVisible()
})
