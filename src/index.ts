import promisePoller from './lib/index'
import {CANCEL_TOKEN} from "./lib/utils"

const $fixedBtn = document.querySelector<HTMLButtonElement>('#fixed-btn')
const $fixedContent = document.querySelector<HTMLParagraphElement>('#fixed-content')
const $asyncFixedBtn = document.querySelector<HTMLButtonElement>('#async-fixed-btn')
const $asyncFixedContent = document.querySelector<HTMLParagraphElement>('#async-fixed-content')
let fixedCounter = 0
let asyncFixedCounter = 0

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

$asyncFixedBtn.onclick = async () => {
  await promisePoller({
    taskFn: async () => {
      if (asyncFixedCounter === 3) {
        throw new Error(CANCEL_TOKEN)
      }

      asyncFixedCounter += 1

      $asyncFixedContent.innerText = asyncFixedCounter.toString()
    },
    interval: 1000,
    shouldContinue: () => {
      return asyncFixedCounter < 10
    }
  })
}
