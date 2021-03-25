import promisePoller from './lib/index'

const $fixedBtn = document.querySelector<HTMLButtonElement>('#fixed-btn')
const $fixedContent = document.querySelector<HTMLParagraphElement>('#fixed-content')
let fixedCounter = 0

$fixedBtn.onclick = () => {
  promisePoller({
    taskFn: () => {
      fixedCounter += 1
      $fixedContent.innerText = fixedCounter.toString()
    },
    interval: 1000
  })
}
