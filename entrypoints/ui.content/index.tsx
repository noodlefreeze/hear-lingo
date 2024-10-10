import ReactDOM from 'react-dom/client'
import { SWRConfig } from 'swr'
import { App } from './app'
import { isValidYouTubeUrl, waitForElementLoaded } from './tools'

export const MATCH_URL = 'https://www.youtube.com/watch?v=*'

export default defineContentScript({
  matches: [MATCH_URL],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'hear-lingo-ui',
      position: 'inline',
      append(_, ui) {
        waitForElementLoaded('#page-manager #columns.ytd-watch-flexy #secondary #secondary-inner', (rootEl) => {
          rootEl.prepend(ui)
        })
      },
      onMount(uiContainer) {
        const rootEl = document.createElement('div')
        const root = ReactDOM.createRoot(rootEl)

        uiContainer.prepend(rootEl)
        waitForElementLoaded('#ytd-player .html5-video-container video', () => {
          const options = {
            revalidateIfStale: false,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
          }

          root.render(
            <SWRConfig value={options}>
              <App ctx={ctx} />
            </SWRConfig>,
          )
        })

        return root
      },
      onRemove(container) {
        container?.unmount()
      },
    })

    ui.mount()
    ctx.addEventListener(window, 'wxt:locationchange', (event) => {
      if (!isValidYouTubeUrl(event.newUrl.href)) {
        ui.remove()
      }
    })
  },
})
