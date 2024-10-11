export function waitForElementLoaded<T extends Element>(selector: string, callback: (el: T) => void) {
  const observer = new MutationObserver(() => {
    const el = document.querySelector<T>(selector)

    if (el) {
      observer.disconnect()
      callback(el)
    }
  })

  observer.observe(document, {
    childList: true,
    subtree: true,
  })
}

export function isValidYouTubeUrl(url: string) {
  const standardRegex = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/
  const shortRegex = /^https:\/\/youtu\.be\/[\w-]{11}$/

  return standardRegex.test(url) || shortRegex.test(url)
}

type Part = undefined | boolean | string | null

export function bcls(...parts: Part[]): string {
  return parts.filter(Boolean).join(' ')
}

export function formatSecondsToMMSS(seconds: number, defaultValue = undefined) {
  if (!Number.isFinite(seconds))
    return defaultValue

  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  const formattedTime = [
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':')

  return formattedTime
}

export function formatMMSSToSeconds(time: string) {
  if (!time.includes(':'))
    return time

  const [m, s] = time.split(':')
  const ms = Number.parseFloat(m) * 60

  return (ms + Number.parseFloat(s)).toString()
}
