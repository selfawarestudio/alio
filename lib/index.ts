import { smitter } from 'smitter'
import { qs, on } from 'martha'

export type AlioTrigger = Element | 'popstate' | 'load'

export interface AlioEnterOptions {
  to: Element
  from?: Element
  href?: string
  trigger: AlioTrigger
}

export interface AlioLeaveOptions {
  from: Element
  href: string
  trigger: AlioTrigger
}

export type AlioEnter = ({
  to,
  from,
  href,
  trigger,
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

export interface AlioEventMap {
  beforeEnter: {
    href: string
    from?: Element
    to: Element
    doc?: Document
    trigger?: AlioTrigger
  }
  afterEnter: {
    href: string
    from?: Element
    to: Element
    doc?: Document
    trigger: AlioTrigger
  }
  beforeLeave: {
    href: String
    from: Element
    trigger: AlioTrigger
  }
  afterLeave: {
    href: String
    from: Element
    trigger: AlioTrigger
  }
  samePage: undefined
}

export interface AlioApi {
  on: (type: string, handler: (payload: any) => void) => any
  go: (href: string) => Promise<void>
}

export function create({ transitions }: AlioOptions): AlioApi {
  let emitter = smitter<AlioEventMap>()
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
  let trigger: AlioTrigger = 'load'
  let parser = new DOMParser()
  let isTransitioning = false

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
      'a[href]:not([target]):not([href*="#"]):not([a-ignore])',
    )

    if (el) {
      let href = el.getAttribute('href')

      if (href?.length) {
        if (
          href.toLowerCase().startsWith('http') &&
          new URL(href).hostname.replace('www.', '') !==
            window.location.hostname
        ) {
          return
        }

        if (isTransitioning) {
          ev.preventDefault()
          return
        }

        let url = new URL(href, window.location.origin)
        let transition = el.getAttribute('a-transition') ?? 'default'

        if (url.pathname !== window.location.pathname) {
          trigger = el
          go(url.href, false, transition)
        } else {
          emitter.emit('samePage')
        }

        ev.preventDefault()
      }
    }
  })

  on(window, 'popstate', ev => {
    if (isTransitioning) {
      ev.preventDefault()
      return
    }

    trigger = 'popstate'
    go(window.location.href, true)
  })

  requestAnimationFrame(() => {
    emitter.emit('beforeEnter', {
      href: window.location.href,
      to: from as Element,
      doc: document,
      trigger,
    })

    transitions.default.enter({ to: from as Element, trigger }).then(() => {
      emitter.emit('afterEnter', {
        href: window.location.href,
        to: from as Element,
        doc: document,
        trigger,
      })
    })
  })

  return {
    on: emitter.on as any,
    go: href => go(href),
  }

  async function go(
    href: string,
    popping: boolean = false,
    transition: string = 'default',
  ) {
    let { leave, enter } = transitions[transition]

    let html = null

    from = qs('[a-page]', root as Element)

    if (!from) {
      throw new Error('[a-page] element missing')
    }

    isTransitioning = true

    emitter.emit('beforeLeave', { href, from, trigger })

    if (!popping) {
      window.history.pushState(null, '', href)
    }

    html = (await Promise.all([get(href), leave({ from, href, trigger })]))[0]

    if (!html) return

    emitter.emit('afterLeave', { href, from, trigger })

    let doc = parser.parseFromString(html, 'text/html')
    let tmpRoot = qs('[a-root]', doc)

    if (!tmpRoot) {
      throw new Error('[a-root] element missing from incoming html')
    }

    to = qs('[a-page]', tmpRoot as Element)

    if (!to) {
      throw new Error('[a-page] element missing from incoming html')
    }

    let title = qs('title', doc)
    if (title && title.textContent) {
      document.title = title.textContent
    }

    // @ts-ignore
    root.append(to)

    emitter.emit('beforeEnter', { href, from, to, doc, trigger })

    await enter({ from, to, trigger })

    emitter.emit('afterEnter', { href, from, to, doc, trigger })

    isTransitioning = false
  }

  async function get(href: string) {
    let html = cache[href]

    if (html) return html

    html = await fetch(href, {
      credentials: 'include',
    }).then(res => res.text())

    cache[href] = html

    return html
  }
}
