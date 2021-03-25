import {delay} from './utils'

interface Options {
  taskFn: Function
  interval: number
}

const promisePoller = (options: Options) => {
  const {taskFn, interval} = options

  const poll = () => {
    taskFn()

    delay(interval).then(poll)
  }

  poll()
}

export default promisePoller
