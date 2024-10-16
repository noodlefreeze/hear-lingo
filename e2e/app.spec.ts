import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function getSubtitles(page: Page) {
  return await page.evaluate(() => {
    const shadowRoot = document.querySelector('hear-lingo-ui')!.shadowRoot!
    const subtitleElements = shadowRoot.querySelectorAll('[data-testid=subtitle]')
    let textContent = ''

    subtitleElements.forEach((el) => {
      textContent += el.textContent
    })

    return textContent
  })
}

test.describe('Hear Lingo Extension', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://www.youtube.com/watch?v=-vZXgApsPCQ')
    await page.waitForSelector('hear-lingo-ui')
  })

  test('extension loads correctly', async ({ page }) => {
    await expect(page.getByTestId('title')).toHaveText('Hear Lingo')
  })

  test('language selector is present and functional', async ({ page }) => {
    const selector = page.getByTestId('language-selector')

    await expect(selector).toBeVisible()

    const options = await selector.locator('option').all()

    expect(options.length).toBeGreaterThan(0)

    if (options.length > 1) {
      const initialSubtitles = await getSubtitles(page)
      const initialLanguage = await selector.evaluate(el => (el as HTMLSelectElement).value)

      for (const option of options) {
        const value = await option.getAttribute('value')

        if (value && value !== initialLanguage) {
          await selector.selectOption(value)
          break
        }
      }

      await page.waitForTimeout(2000)

      const updatedSubtitles = await getSubtitles(page)

      expect(updatedSubtitles).not.toBe(initialSubtitles)
    }
  })

  // test('loop control functionality', async ({ page }) => {
  //   const loopBtn = page.getByTestId('loop-button')
  //   const videoEl = await page.evaluate(() => {
  //     return document.querySelector('#ytd-player .html5-video-container video')
  //   }) as HTMLVideoElement

  //   loopBtn.click()
  //   await expect(page.getByRole('heading', { name: 'Loop Control' })).toBeVisible()
  //   await page.getByTestId('start').fill('00:10')
  //   await page.getByTestId('end').fill('00:20')
  //   await page.getByRole('button', { name: 'Start Loop' }).click()
  //   await expect(page.getByRole('button', { name: 'Stop Loop' })).toBeEnabled()
  //   await page.waitForTimeout(5000)

  //   const currentTime = videoEl.currentTime

  //   expect(currentTime).toBeGreaterThanOrEqual(10)
  //   expect(currentTime).toBeLessThanOrEqual(20)
  // })

  // test('subtitles panel toggles correctly', async ({ page }) => {
  //   const videoEl = await page.evaluate(() => {
  //     return document.querySelector('#ytd-player .html5-video-container video')
  //   }) as HTMLVideoElement
  //   const subtitlesButton = page.getByRole('button', { name: 'Subtitles' })

  //   await subtitlesButton.click()

  //   const subtitlesPanel = page.getByTestId('subtitles-panel')

  //   videoEl.pause()
  //   await expect(subtitlesPanel).toBeVisible()
  //   videoEl.play()
  //   await expect(subtitlesPanel).toBeHidden()
  // })

  // test('subtitles update as video plays', async ({ page }) => {
  //   await page.evaluate(() => {
  //     const video = document.querySelector<HTMLVideoElement>('#ytd-player .html5-video-container video')

  //     if (video) {
  //       video.currentTime = 10
  //       video.play()
  //     }
  //   })
  //   await page.waitForTimeout(2000)

  // })
})
