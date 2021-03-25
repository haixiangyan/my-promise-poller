export const delay = (interval: number) => new Promise(resolve => {
  setTimeout(resolve, interval)
})
