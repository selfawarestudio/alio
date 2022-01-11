# alio

:spa A lightweight pjax library with a focus on animated page transitions.

## Features
- 🦠 Tiny & minimal (1.3kb gizipped)
- 🍴 Cancellable transitions
- 🗺️ Contextual transitions

## Installation
```
npm i alio
```

## Quick Start

Every page of your website will need exactly 1 element with an `a-root` attribute. The `a-root` needs exactly 1 child element with an `a-page` attribute.

```html
<div a-root>
  <div a-page>
    <!-- Page content here -->
  </div>
</div>
```

Then create an alio instance and a default transition. In alio, transitions are just objects with async `enter` and `leave` methods. In the example below, [`motion`](https://motion.dev) is used to implement a basic fade transition.

```js
import { create } from 'alio'
import { animate } from 'motion'

const alio = create({
  transitions: {
    default: {
      async enter({ from, to, href }) {
        window.scroll(0, 0)
        from?.remove()
        await animate(to, { opacity: [0, 1] }).finished
      },
      async leave({ from, href }) {
        await animate(from, { opacity: 0 }).finished
      },
    }
  }
})

// alio events
alio.on('beforeLeave', ({ href, from }) => {})
alio.on('afterLeave', ({ href, from }) => {})
alio.on('beforeEnter', ({ href, from, to }) => {})
alio.on('afterEnter', ({ href, from, to }) => {})
alio.on('leaveCancelled', ({ href, from }) => {})
alio.on('enterCancelled', ({ href, from, to }) => {})
alio.on('error', (error) => {})
alio.on('samePage', () => {})

// programmatic redirect
alio.go('/another-page')
```

The alio instance offers an `on` method for listening to alio events. There is also a `go` method for programmatically redirecting to a different page.

## TODO's
- [ ] Complete API reference
- [ ] Write tests
- [ ] Set up CI/CD for releases
- [ ] Build out examples
  - [x] Persistent navigation
  - [ ] GSAP
  - [ ] CSS
  - [ ] Overlapping transition
  - [ ] Contextual transition
  - [ ] Ignore
  - [ ] Analytics
  - [ ] Prefetching
  - [ ] Anchor Links




