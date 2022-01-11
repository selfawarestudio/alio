import { create } from '../../lib'
import { animate } from 'motion'

let alio = create({
  transitions: {
    default: {
      async enter({ from, to }) {
        window.scroll(0, 0)
        from?.remove()
        await animate(to, { opacity: [0, 1] }).finished
      },
      async leave({ from }) {
        await animate(from, { opacity: 0 }).finished
      },
    },
  },
})

alio.on('beforeLeave', () => {
  console.log('beforeLeave')
})

alio.on('afterLeave', () => {
  console.log('afterLeave')
})

alio.on('beforeEnter', () => {
  console.log('beforeEnter')
})

alio.on('afterEnter', () => {
  console.log('afterEnter')
  console.log('---')
})

alio.on('leaveCancelled', ({ from }) => {
  animate(from, { x: 0 }, { duration: 1 })
  console.log('---')
  console.log('%cleaveCancelled', 'font-weight:700;color:blue;')
})

alio.on('enterCancelled', () => {
  console.log('---')
  console.log('%centerCancelled', 'font-weight:700;color:blue;')
})

alio.on('error', (error) => {
  console.log('%cerror', 'font-weight:700;color:red;', error)
})

alio.on('samePage', () => {
  console.log('samePage')
  console.log('---')
})
