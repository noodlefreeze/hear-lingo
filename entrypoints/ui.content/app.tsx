import type { ContentScriptContext } from 'wxt/client'
import type { Caption, Subtitle } from './fetchers'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Fragment, type MouseEvent } from 'react'
import useSWR from 'swr'
import { fetchCurrentVideoCaptions, fetchSubtitles } from './fetchers'
import { bcls, formatSecondsToMMSS, isValidYouTubeUrl } from './tools'
import '~/assets/tailwind.css'

interface AppProps {
  ctx: ContentScriptContext
}

export function App({ ctx }: AppProps) {
  const captions = useSWR('hear-lingo-captions', fetchCurrentVideoCaptions)

  let caption: Caption | null = null
  if (captions.data && captions.data.length) {
    caption = captions.data.find(c => c.languageCode === 'en') ?? captions.data[0]
  }

  const subtitles = useSWR(() => caption ? caption.baseUrl : null, fetchSubtitles)
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

  return (
    <div className="bg-gray-100 p-4 mb-4">
      <div>header</div>
      <section className="bg-white rounded-lg shadow-lg">
        {subtitles.data ? <Subtitles subtitles={subtitles.data} videoRef={videoRef} /> : null}
      </section>
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

  const currentSubtitleIntoView = useCallback(() => {

  }, [])

  const toggleSubtitlesPanel = useCallback(() => {
    if (videoEl.played && !isSubtitlesPanelOpen) {
      videoEl.pause()
      setIsSubtitlesPanelOpen(true)
      currentSubtitleIntoView()
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
    const targetEl = clickedEl.closest('[data-start]') as HTMLElement
    const start = Number.parseFloat(targetEl.getAttribute('data-start') as string)

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
      currentSubtitleIntoView()
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
        className={bcls('space-y-2 transition-all duration-300 ease-in-out overflow-auto p-4 pr-0', isSubtitlesPanelOpen ? 'h-80' : 'h-0 py-0')}
        onClick={handleSubtitleClick}
      >
        {subtitles.map((subtitle) => {
          const currentPlay = currentTime >= subtitle.start && currentTime < subtitle.start + subtitle.dur

          return (
            <div
              key={subtitle.start}
              data-start={subtitle.start}
              className={bcls(
                'flex items-center space-x-2 p-2',
                currentPlay ? 'bg-yellow-100' : 'bg-gray-100',
                'rounded-lg group transition duration-300 ease-in-out hover:bg-gray-200 cursor-default',
              )}
            >
              <p dangerouslySetInnerHTML={{ __html: subtitle.content ?? '' }} className={bcls('flex-grow text-base', currentPlay && 'font-medium')} />
              <span className="text-xs text-gray-500 whitespace-nowrap">{formatSecondsToMMSS(subtitle.start)}</span>
            </div>
          )
        })}
      </div>
    </Fragment>
  )
}
