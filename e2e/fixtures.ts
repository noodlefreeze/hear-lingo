import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'
import { test as base, type BrowserContext, chromium } from '@playwright/test'

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-'))

export const test = base.extend<{
  context: BrowserContext
  extensionId: string
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({ }, use) => {
    const pathToExtension = path.join(__dirname, '../.output/chrome-mv3')
    const context = await chromium.launchPersistentContext(tempDir, {
      headless: false,
      args: [
        `--headless=new`,
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    })
    await use(context)
    await context.close()
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers()
    if (!background)
      background = await context.waitForEvent('serviceworker')

    const extensionId = background.url().split('/')[2]
    await use(extensionId)
  },
})
export const expect = test.expect
