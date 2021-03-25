import promisePoller from './lib/index'

const $fixedBtn = document.querySelector<HTMLButtonElement>('#fixed-btn')
const $fixedContent = document.querySelector<HTMLParagraphElement>('#fixed-content')
let fixedCounter = 0

$fixedBtn.onclick = async () => {
  await promisePoller({
    taskFn: () => {
      fixedCounter += 1
      $fixedContent.innerText = fixedCounter.toString()
    },
    shouldContinue: () => fixedCounter < 10,
    interval: 1000
  })
}
