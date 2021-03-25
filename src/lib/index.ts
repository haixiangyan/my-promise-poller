const promisePoller = (taskFn: Function, interval: number) => {
  setInterval(() => {
    taskFn();
  }, interval)
}

export default promisePoller
