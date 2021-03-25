export const timeout = (promise: Promise<any>, interval: number) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject('Task timeout'), interval)

    promise.then(result => {
      clearTimeout(timeoutId)
      resolve(result)
    })
  })
}

export const delay = (interval: number) => new Promise(resolve => {
  setTimeout(resolve, interval)
})
