import type { ChangeEvent, MouseEvent } from 'react'
import type { ContentScriptContext } from 'wxt/client'
import type { Caption, Subtitle } from './fetchers'
import { ChevronDown, ChevronUp, Globe } from 'lucide-react'
import { Fragment } from 'react'
import useSWR from 'swr'
import { fetchCurrentVideoCaptions, fetchSubtitles } from './fetchers'
import { bcls, formatSecondsToMMSS, isValidYouTubeUrl } from './tools'
import '~/assets/tailwind.css'

interface AppProps {
  ctx: ContentScriptContext
}

export function App({ ctx }: AppProps) {
  const captions = useSWR('hear-lingo-captions', fetchCurrentVideoCaptions)
  // TODO perhaps there is a better way to define the key of subtitles
  const subtitles = useSWR(() => {
    let caption: Caption | null = null

    if (captions.data && captions.data.length) {
      caption = captions.data.find(c => c.languageCode === 'en') ?? captions.data[0]
    }

    return caption ? caption.baseUrl : null
  }, fetchSubtitles)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    ctx.addEventListener(window, 'wxt:locationchange', (event) => {
      if (isValidYouTubeUrl(event.newUrl.href)) {
        captions.mutate()
      }
    })

    const videoEl = document.querySelector<HTMLVideoElement>('#ytd-player .html5-video-container video')

    videoRef.current = videoEl
  }, [])

  if (captions.isLoading || !videoRef.current)
    return null // TODO loading style
  if (captions.error) {
    return ( // TODO error style
      <div>
        <p>Error:</p>
        <p>{captions.error.message}</p>
      </div>
    )
  }

  function handleLanguageChange(e: ChangeEvent<HTMLSelectElement>) {
    subtitles.mutate(fetchSubtitles(e.target.value as string), {
      revalidate: false,
    })
  }

  return (
    <div className="bg-gray-100 p-4 mb-4 rounded-lg shadow-lg">
      <div className="rounded-lg bg-white">
        <section className="bg-gradient-to-r from-blue-500 rounded-t-lg to-blue-600 p-4 text-white transition-colors duration-300">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Hear Lingo</h1>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <select
                  onChange={handleLanguageChange}
                  className="appearance-none bg-white bg-opacity-20 border border-white border-opacity-30 text-white rounded-md py-1 pl-8 pr-6 text-sm leading-tight focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 transition duration-300"
                  defaultValue={captions.data?.find(c => c.languageCode === 'en')?.baseUrl ?? captions.data?.[0]?.baseUrl}
                >
                  {captions.data!.map(caption => (
                    <option value={caption.baseUrl} key={caption.name.simpleText}>{caption.name.simpleText}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-white">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-white">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section>
          {subtitles.data ? <Subtitles subtitles={subtitles.data} videoRef={videoRef} /> : null}
        </section>
      </div>
    </div>
  )
}

interface SubtitlesProps {
  subtitles: Subtitle[]
  videoRef: React.RefObject<HTMLVideoElement>
}

function Subtitles(props: SubtitlesProps) {
  const { subtitles, videoRef } = props
  const videoEl = videoRef.current!
  const [currentTime, setCurrentTime] = useState(0)
  const [isSubtitlesPanelOpen, setIsSubtitlesPanelOpen] = useState(videoEl.paused)
  const subtitlesRef = useRef<HTMLDivElement | null>(null)

  const scrollCurrentSubtitleIntoView = useCallback(() => {
    const subtitlesEl = subtitlesRef.current

    if (subtitlesEl) {
      for (const child of subtitlesEl.children) {
        const start = (child as HTMLDivElement).dataset.start
        const dur = (child as HTMLDivElement).dataset.dur

        if (Number.isFinite(Number.parseFloat(start ?? '')) && Number.isFinite(Number.parseFloat(dur ?? ''))) {
          const s = Number.parseFloat(start as string)
          const d = Number.parseFloat(dur as string)

          // the subtitle currently playing
          if (videoEl.currentTime >= s && videoEl.currentTime < s + d) {
            child.scrollIntoView({
              block: 'nearest',
              behavior: 'smooth',
            })
            break
          }
        }
      }
    }
  }, [])

  const toggleSubtitlesPanel = useCallback(() => {
    if (videoEl.played && !isSubtitlesPanelOpen) {
      videoEl.pause()
      setIsSubtitlesPanelOpen(true)
    }
    else {
      setIsSubtitlesPanelOpen(!isSubtitlesPanelOpen)
    }
  }, [isSubtitlesPanelOpen])

  function handleSubtitleClick(e: MouseEvent<HTMLTableSectionElement>) {
    // if the white space is clicked, do nothing
    if (e.target === e.currentTarget)
      return

    const clickedEl = e.target as HTMLElement
    const targetEl = clickedEl.closest('data-start') as HTMLElement
    const start = Number.parseFloat(targetEl.dataset.start as string)

    videoEl.currentTime = start
    setCurrentTime(start)
  }

  useEffect(() => {
    function updateCurrentTime() {
      setCurrentTime(videoEl.currentTime)
    }
    function closePanel() {
      setIsSubtitlesPanelOpen(false)
    }
    function openPanel() {
      setIsSubtitlesPanelOpen(true)
    }

    videoEl.addEventListener('timeupdate', updateCurrentTime)
    videoEl.addEventListener('play', closePanel)
    videoEl.addEventListener('pause', openPanel)

    return () => {
      videoEl.removeEventListener('timeupdate', updateCurrentTime)
      videoEl.removeEventListener('play', closePanel)
      videoEl.removeEventListener('pause', openPanel)
    }
  }, [])

  useEffect(() => {
    if (isSubtitlesPanelOpen && videoEl.paused) {
      scrollCurrentSubtitleIntoView()
    }
  }, [isSubtitlesPanelOpen, currentTime])

  return (
    <Fragment>
      <button
        onClick={toggleSubtitlesPanel}
        className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition duration-300 bg-white"
      >
        <h2 className="text-base font-semibold text-gray-700">Subtitles</h2>
        {
          isSubtitlesPanelOpen
            ? <ChevronUp className="w-5 h-5 text-gray-500" />
            : <ChevronDown className="w-5 h-5 text-gray-500" />
        }
      </button>
      <div
        className={bcls(
          'space-y-2 transition-all duration-300 ease-in-out overflow-auto p-4 pr-0',
          isSubtitlesPanelOpen ? 'h-80' : 'h-0 py-0',
        )}
        onClick={handleSubtitleClick}
        ref={subtitlesRef}
      >
        {subtitles.map((subtitle) => {
          const currentPlay = currentTime >= subtitle.start && currentTime < subtitle.start + subtitle.dur

          return (
            <div
              key={subtitle.start}
              data-start={subtitle.start}
              data-dur={subtitle.dur}
              className={bcls(
                'flex items-center space-x-2 p-2',
                currentPlay ? 'bg-yellow-100' : 'bg-gray-100',
                'rounded-lg group transition duration-300 ease-in-out hover:bg-gray-200 cursor-default',
              )}
            >
              <p
                dangerouslySetInnerHTML={{ __html: subtitle.content ?? '' }}
                className={bcls(
                  'flex-grow text-base',
                  currentPlay && 'font-medium',
                )}
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">{formatSecondsToMMSS(subtitle.start)}</span>
            </div>
          )
        })}
      </div>
    </Fragment>
  )
}
