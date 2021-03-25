interface Options {
  taskFn: Function
  interval: number
}

const promisePoller = (options: Options) => {
  const {taskFn, interval} = options

  const poll = () => {
    setTimeout(() => {
      taskFn()
      poll()
    }, interval)
  }

  poll()
}

export default promisePoller
