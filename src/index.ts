import promisePoller from './lib/index'

const $fixedBtn = document.querySelector<HTMLButtonElement>('#fixed-btn')
const $fixedContent = document.querySelector<HTMLParagraphElement>('#fixed-content')
let fixedCounter = 0

$fixedBtn.onclick = () => {
  promisePoller(() => {
    fixedCounter += 1
    $fixedContent.textContent = fixedCounter.toString()
  }, 1000)
}
