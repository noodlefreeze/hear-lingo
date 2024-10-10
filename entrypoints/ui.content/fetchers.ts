export interface Caption {
  baseUrl: string
  vssId: string
  languageCode: string
  name: {
    simpleText: string
  }
}

export interface Subtitle {
  start: number
  dur: number
  content: string | null
}

export interface VideoInfo {
  captions: Caption[] | undefined
  subtitles: Subtitle[] | undefined
}

export async function fetchCurrentVideoCaptions() {
  const searchParams = new URLSearchParams(location.search)
  const videoId = searchParams.get('v') as string

  return await fetchCaptions(videoId)
}

async function fetchCaptions(videoId: string) {
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch captions, response code: ${response.status}`)
  }

  const text = await response.text()
  const doc = new DOMParser().parseFromString(text, 'text/html')
  const scripts = doc.getElementsByTagName('script')

  for (const script of scripts) {
    const content = script.textContent

    if (content?.includes('var ytInitialPlayerResponse')) {
      const startStr = 'captions":'
      const endStr = ',"videoDetails'
      const startIndex = content.indexOf(startStr)
      const endIndex = content.lastIndexOf(endStr)

      if (startIndex !== -1 && endIndex !== -1) {
        try {
          const captionsData = JSON.parse(content.slice(startIndex + startStr.length, endIndex)) as { playerCaptionsTracklistRenderer: { captionTracks: Caption[] } }
          // remove auto generated captions
          const captions = captionsData.playerCaptionsTracklistRenderer.captionTracks.filter(caption => !caption.vssId.startsWith('a.'))

          return captions
        }
        catch (e) {
          console.error('Failed to parse ytInitialPlayerResponse: \n', e)
        }
      }
      break
    }
  }
}

export async function fetchSubtitles(baseUrl: string) {
  const response = await fetch(baseUrl, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch subtitles, response code: ${response.status}`)
  }

  const text = await response.text()
  const doc = new DOMParser().parseFromString(text, 'text/xml').querySelector('transcript')
  const textEls = doc?.querySelectorAll('text')

  if (textEls) {
    const subtitles: Subtitle[] = []

    textEls.forEach((textEl) => {
      const start = Number.parseFloat(textEl.getAttribute('start') ?? '0')
      const dur = Number.parseFloat(textEl.getAttribute('dur') ?? '0')
      const content = textEl.textContent

      subtitles.push({ start, dur, content })
    })

    return subtitles
  }
}
