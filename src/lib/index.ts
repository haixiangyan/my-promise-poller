import {delay} from './utils'

interface Options {
  taskFn: Function
  interval: number
  masterTimeout?: number
}

const promisePoller = (options: Options) => {
  const {taskFn, interval, masterTimeout} = options

  let timeoutId

  return new Promise((resolve, reject) => {
    if (masterTimeout) {
      timeoutId = setTimeout(() => {
        reject('Master timeout')
      }, masterTimeout)
    }

    const poll = () => {
      const result = taskFn()

      resolve(result)

      delay(interval).then(poll)
    }

    poll()
  })
}

export default promisePoller
