import { create } from '../../lib'
import { animate } from 'motion'

let attentive = create({
  transitions: {
    default: {
      enter({ from, to }) {
        window.scrollTo(0, 0)
        from && from.remove()
        return animate(to, { opacity: 1 }, { duration: 1 }).finished
      },
      leave({ from }) {
        return animate(from, { opacity: 0 }, { duration: 1 }).finished
      },
    },
    test: {
      enter({ from, to, leaveCancelled }) {
        window.scrollTo(0, 0)
        from && from.remove()
        return animate(
          to,
          { opacity: 1, x: leaveCancelled ? 0 : [-10, 0] },
          { duration: 1 },
        ).finished
      },
      leave({ from }) {
        return animate(from, { opacity: 0, x: 10 }, { duration: 1 }).finished
      },
    },
  },
})

attentive.on('beforeLeave', () => {
  console.log('beforeLeave')
})

attentive.on('afterLeave', () => {
  console.log('afterLeave')
})

attentive.on('beforeEnter', () => {
  console.log('beforeEnter')
})

attentive.on('afterEnter', () => {
  console.log('afterEnter')
  console.log('---')
})

attentive.on('leaveCancelled', ({ from }) => {
  animate(from, { x: 0 }, { duration: 1 })
  console.log('---')
  console.log('%cleaveCancelled', 'font-weight:700;color:blue;')
})

attentive.on('enterCancelled', () => {
  console.log('---')
  console.log('%centerCancelled', 'font-weight:700;color:blue;')
})

attentive.on('error', (error) => {
  console.log('%cerror', 'font-weight:700;color:red;', error)
})

attentive.on('samePage', () => {
  console.log('samePage')
  console.log('---')
})
