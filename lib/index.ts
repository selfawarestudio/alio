import { smitter } from 'smitter'
import { qs, on } from 'martha'

export interface AlioEnterOptions {
  to: Element
  from?: Element
  href?: string
  leaveCancelled?: boolean
}

export interface AlioLeaveOptions {
  from: Element
  href: string
}

export type AlioEnter = ({
  from,
  to,
  href,
}: AlioEnterOptions) => PromiseLike<any>

export type AlioLeave = ({ from, href }: AlioLeaveOptions) => PromiseLike<any>

export interface AlioTransition {
  enter: AlioEnter
  leave: AlioLeave
}

export interface AlioOptions {
  transitions: {
    default: AlioTransition
    [name: string]: AlioTransition
  }
}

export type AlioCache = Record<string, string>

export interface AlioApi {
  on: (type: string, handler: (payload: any) => void) => any
  go: (href: string) => Promise<void>
}

export function create({ transitions }: AlioOptions): AlioApi {
  let IDLE = 'idle'
  let LEAVING = 'leaving'
  let ENTERING = 'entering'

  let emitter = smitter()
  let lastHref: string | null = null

  let cache: AlioCache = {
    [window.location.pathname]: document.documentElement.outerHTML,
  }

  let root = qs('[a-root]')

  if (!root) {
    throw new Error('[a-root] element missing')
  }

  let from = qs('[a-page]', root)

  if (!from) {
    throw new Error('[a-page] element missing')
  }

  let to: Element | null = null

  let abortController = new AbortController()
  let parser = new DOMParser()

  let status = IDLE
  let leaveCancelled = false
  let enterCancelled = false

  on(document, 'click', event => {
    let ev = event as MouseEvent
    let target = ev.target as Element

    if (
      ev.ctrlKey ||
      ev.metaKey ||
      ev.altKey ||
      ev.shiftKey ||
      ev.defaultPrevented
    ) {
      return
    }

    let el = target?.closest(
      'a[href]:not([target]):not([href|="#"]):not([a-ignore])',
    )

    if (el) {
      let href = el.getAttribute('href')

      if (href?.length) {
        let url = new URL(href, window.location.origin)
        let transition = el.getAttribute('a-transition') ?? 'default'

        if (url.pathname !== window.location.pathname) {
          go(url.href, false, transition)
        } else {
          emitter.emit('samePage')
        }

        ev.preventDefault()
      }
    }
  })

  on(window, 'popstate', () => {
    go(window.location.href, true)
  })

  transitions.default.enter({ to: from })

  return {
    on: emitter.on,
    go: href => go(href),
  }

  async function go(
    href: string,
    popping: boolean = false,
    transition: string = 'default',
  ) {
    let { leave, enter } = transitions[transition]

    if (typeof leave !== 'function') {
      throw new Error(`leave missing from: ${transition}`)
    }

    if (typeof enter !== 'function') {
      throw new Error(`enter missing from: ${transition}`)
    }

    let html = null
    from = qs('[a-page]', root as ParentNode)

    if (!from) {
      throw new Error('[a-page] element missing')
    }

    if (status === LEAVING) {
      leaveCancelled = true
      abortController.abort()
      emitter.emit('leaveCancelled', { href, from })
      if (lastHref === href) {
        interruptLeaveWithEnter(href, popping, transition)
        return
      }
    }

    if (status === ENTERING) {
      enterCancelled = true
      emitter.emit('enterCancelled', { href, from, to })
    }

    status = LEAVING

    emitter.emit('beforeLeave', { href, from })

    if (!popping) {
      window.history.pushState(null, '', href)
    }

    html = (await Promise.all([get(href), leave({ from, href })]))[0]

    if (leaveCancelled) {
      leaveCancelled = false
      return
    }

    if (!html) return

    emitter.emit('afterLeave', { href, from })

    status = ENTERING
    let doc = parser.parseFromString(html, 'text/html')
    let tmpRoot = qs('[a-root]', doc)

    if (!tmpRoot) {
      throw new Error('[a-root] element missing from incoming html')
    }

    to = qs('[a-page]', tmpRoot as ParentNode)

    if (!to) {
      throw new Error('[a-page] element missing from incoming html')
    }

    let title = qs('title', doc)
    if (title && title.textContent) {
      document.title = title.textContent
    }

    // @ts-ignore
    root.append(to)

    emitter.emit('beforeEnter', { href, from, to, doc })

    await enter({ from, to })

    if (enterCancelled) {
      enterCancelled = false
      return
    }

    emitter.emit('afterEnter', { href, from, to, doc })

    status = IDLE
    lastHref = href
  }

  async function interruptLeaveWithEnter(
    href: string,
    popping: boolean,
    transition: string,
  ) {
    if (status === ENTERING) {
      enterCancelled = true
      emitter.emit('enterCancelled')
    }

    status = ENTERING

    let to = qs('[a-page]', root as ParentNode)

    if (!to) {
      throw new Error('[a-page] element missing')
    }

    if (!popping) {
      window.history.pushState(null, '', href)
    }

    emitter.emit('beforeEnter', { href, to })
    await transitions[transition].enter({ to, leaveCancelled: true })

    if (enterCancelled) {
      enterCancelled = false
      return
    }

    emitter.emit('afterEnter', { href, to })

    status = IDLE
  }

  async function get(href: string) {
    abortController = new AbortController()

    let html = cache[href]

    if (html) return html

    try {
      html = await fetch(href, {
        credentials: 'include',
        signal: abortController.signal,
      }).then(res => res.text())
    } catch (error) {
      // @ts-ignore
      if (error?.name === 'AbortError') return
    }

    cache[href] = html

    return html
  }
}
