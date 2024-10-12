import type { ChangeEvent, MouseEvent } from 'react'
import type { ContentScriptContext } from 'wxt/client'
import type { Caption, Subtitle } from './fetchers'
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react'
import { ChevronDown, ChevronUp, Globe, Repeat } from 'lucide-react'
import { Fragment } from 'react'
import useSWR from 'swr'
import { fetchCurrentVideoCaptions, fetchSubtitles } from './fetchers'
import { bcls, findCurrentSubtitle, formatMMSSToSeconds, formatSecondsToMMSS, isValidYouTubeUrl } from './tools'
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
        <Controller videoRef={videoRef} />
        <section>
          {subtitles.data ? <Subtitles subtitles={subtitles.data} videoRef={videoRef} /> : null}
        </section>
      </div>
    </div>
  )
}

interface ControllerProps {
  videoRef: React.RefObject<HTMLVideoElement>
}

function Controller(props: ControllerProps) {
  const { videoRef } = props

  return (
    <section className="p-4 border-b border-gray-200 transition-colors duration-300">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex space-x-2">
          <LoopControl videoRef={videoRef} />
        </div>
      </div>
    </section>
  )
}

interface LoopControlProps {
  videoRef: React.RefObject<HTMLVideoElement>
}

function LoopControl(props: LoopControlProps) {
  const { videoRef } = props
  const videoEl = videoRef.current as HTMLVideoElement
  const [isLooping, setIsLooping] = useState(false)
  const [loopRange, setLoopRange] = useState({ start: '', end: '' })

  function handleLoopRangeSubmit(e: ChangeEvent<HTMLFormElement>) {
    e.preventDefault()

    const target = e.target as HTMLFormElement
    const data = new FormData(target)
    const loopStart = data.get('start') as string
    const loopEnd = data.get('end') as string

    if (!loopStart && !loopEnd)
      return

    const re = /^\d+$|^\d+:\d+$/
    const result = { start: '', end: '' }

    if (re.test(loopStart))
      result.start = formatMMSSToSeconds(loopStart)
    if (re.test(loopEnd))
      result.end = formatMMSSToSeconds(loopEnd)
    setLoopRange(result)
    if (!isLooping)
      setIsLooping(true)
  }

  useEffect(() => {
    function checkEndpointTime() {
      const currentTime = videoEl.currentTime
      const start = Number.parseFloat(loopRange.start)
      const end = Number.parseFloat(loopRange.end)

      if (Number.isFinite(start) && currentTime < start) {
        videoEl.currentTime = start
      }
      else if (Number.isFinite(end) && currentTime > end) {
        videoEl.currentTime = start
      }
    }

    if (isLooping) {
      videoEl.addEventListener('timeupdate', checkEndpointTime)
    }

    return () => {
      videoEl.removeEventListener('timeupdate', checkEndpointTime)
    }
  }, [isLooping, loopRange])

  return (
    <Popover>
      {({ open }) => (
        <Fragment>
          <PopoverButton
            className={bcls(
              'flex items-center px-4 py-2 rounded-md text-sm font-medium transition duration-300',
              (open || isLooping) ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            )}
          >
            <Repeat className="w-4 h-4 mr-2" />
            Loop
          </PopoverButton>
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <PopoverPanel
              className="absolute z-[3000] mt-2 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            >
              <div className="p-4">
                <h3
                  className="text-lg font-semibold mb-2 text-gray-900"
                >
                  Loop Control
                </h3>
                <p className="text-sm mb-4 text-gray-600 whitespace-nowrap">Enter loop start and end times in SS or MM:SS:</p>
                <form onSubmit={handleLoopRangeSubmit}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="relative">
                      <label
                        htmlFor="start"
                        className="absolute -top-2 left-2 inline-block bg-white px-1 text-sm font-medium text-gray-900"
                      >
                        Start
                      </label>
                      <input
                        id="start"
                        name="start"
                        type="text"
                        placeholder="12:34"
                        className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-300 text-gray-900 transition-colors duration-300"
                        data-endpoint="start"
                        autoComplete="off"
                        defaultValue={formatSecondsToMMSS(Number.parseFloat(loopRange.start))}
                      />
                    </div>
                    <div className="relative">
                      <label
                        htmlFor="end"
                        className="absolute -top-2 left-2 inline-block bg-white px-1 text-sm font-medium text-gray-900"
                      >
                        End
                      </label>
                      <input
                        id="end"
                        name="end"
                        type="text"
                        placeholder="5678"
                        className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white border-gray-300 text-gray-900 transition-colors duration-300"
                        data-endpoint="end"
                        autoComplete="off"
                        defaultValue={formatSecondsToMMSS(Number.parseFloat(loopRange.end))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center text-white px-4 py-2 rounded-md text-sm font-medium transition duration-300 bg-green-500 hover:bg-green-600"
                    >
                      {isLooping ? 'Update' : 'Start Loop'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLooping(false)}
                      className={bcls(
                        'flex-1 flex items-center justify-center',
                        'text-white px-4 py-2 rounded-md text-sm font-medium transition duration-300',
                        isLooping ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600',
                      )}
                    >
                      Stop Loop
                    </button>
                  </div>
                </form>
              </div>
            </PopoverPanel>
          </Transition>
        </Fragment>
      )}
    </Popover>
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
      const targetEl = findCurrentSubtitle(subtitlesEl.children, videoEl.currentTime)

      if (targetEl) {
        targetEl.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
    }
  }, [])

  function toggleSubtitlesPanel() {
    if (videoEl.played && !isSubtitlesPanelOpen) {
      videoEl.pause()
      setIsSubtitlesPanelOpen(true)
    }
    else {
      setIsSubtitlesPanelOpen(!isSubtitlesPanelOpen)
    }
  }

  function handleSubtitleClick(e: MouseEvent<HTMLTableSectionElement>) {
    // if the white space is clicked, do nothing
    if (e.target === e.currentTarget)
      return

    const clickedEl = e.target as HTMLElement
    const targetEl = clickedEl.closest('[data-start]') as HTMLElement
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
          'space-y-2 transition-all duration-300 ease-in-out overflow-auto p-4',
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
