import { smitter } from 'smitter'
import { qs, on } from 'martha'

export interface AttentiveEnterOptions {
  to: Element
  from?: Element
  href?: string
  leaveCancelled?: boolean
}

export interface AttentiveLeaveOptions {
  from: Element
  href: string
}

export type AttentiveEnter = ({
  from,
  to,
  href,
}: AttentiveEnterOptions) => PromiseLike<any>

export type AttentiveLeave = ({
  from,
  href,
}: AttentiveLeaveOptions) => PromiseLike<any>

export interface AttentiveTransition {
  enter: AttentiveEnter
  leave: AttentiveLeave
}

export interface AttentiveOptions {
  transitions: {
    default: AttentiveTransition
    [name: string]: AttentiveTransition
  }
}

export type AttentiveCache = Record<string, string>

export interface AttentiveAPI {
  on: (type: string, handler: (payload: any) => void) => any
  go: (href: string) => Promise<void>
}

export function create({ transitions }: AttentiveOptions): AttentiveAPI {
  let IDLE = 'idle'
  let LEAVING = 'leaving'
  let ENTERING = 'entering'

  let emitter = smitter()
  let lastHref: string | null = null

  let cache: AttentiveCache = {
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

    let el =
      target &&
      target.closest('a[href]:not([target]):not([href|="#"]):not([a-ignore])')

    if (el) {
      let href = el.getAttribute('href')

      if (href && href.length) {
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
    try {
      let { leave, enter } = transitions[transition]

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

      emitter.emit('beforeEnter', { href, from, to })

      await enter({ from, to })

      if (enterCancelled) {
        enterCancelled = false
        return
      }

      emitter.emit('afterEnter', { href, from, to })

      status = IDLE
      lastHref = href
    } catch (error) {
      // @ts-ignore
      if (error.name === 'AbortError') return
      emitter.emit('error', error)
    }
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

    html = await fetch(href, {
      credentials: 'include',
      signal: abortController.signal,
    }).then(res => res.text())

    cache[href] = html

    return html
  }
}
