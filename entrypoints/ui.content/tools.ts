import { MATCH_URL } from '.'

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
  // 正则表达式用于匹配标准 YouTube 视频链接
  const standardRegex = /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/
  // 正则表达式用于匹配短链接
  const shortRegex = /^https:\/\/youtu\.be\/[\w-]{11}$/

  return standardRegex.test(url) || shortRegex.test(url)
}

type Part = undefined | boolean | string | null

export function bcls(...parts: Part[]): string {
  return parts.filter(Boolean).join(' ')
}

export function formatSecondsToMMSS(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)

  const formattedTime = [
    String(minutes).padStart(2, '0'),
    String(secs).padStart(2, '0'),
  ].join(':')

  return formattedTime
}
