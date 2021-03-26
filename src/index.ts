import promisePoller from './lib/index'
import {CANCEL_TOKEN} from "./lib/utils"

const $start = document.querySelector<HTMLButtonElement>('#start')
const $asyncStop = document.querySelector<HTMLButtonElement>('#async-stop')

const $fixedCounter = document.querySelector<HTMLParagraphElement>('#fixed-counter')
const $linearCounter = document.querySelector<HTMLParagraphElement>('#linear-counter')
const $exponentialCounter = document.querySelector<HTMLParagraphElement>('#exponential-counter')

let fixedCounter = 0
let linearCounter = 0
let exponentialCounter = 0

let stop = false

const limit = 99999

$start.onclick = async () => {
  promisePoller({
    strategy: 'fixed-interval',
    interval: 100,
    taskFn: async () => {
      if (stop) {
        throw new Error(CANCEL_TOKEN)
      }

      fixedCounter += 1
      $fixedCounter.innerText = fixedCounter.toString()
    },
    shouldContinue: () => fixedCounter < limit,
  })
  promisePoller({
    strategy: 'linear-backoff',
    start: 100,
    increment: 100,
    taskFn : async () => {
      if (stop) {
        throw new Error(CANCEL_TOKEN)
      }

      linearCounter += 1
      $linearCounter.innerText = linearCounter.toString()
    },
    shouldContinue: () => linearCounter < limit
  })
  promisePoller({
    strategy: 'exponential-backoff',
    min: 100,
    max: 3000,
    taskFn : async () => {
      if (stop) {
        throw new Error(CANCEL_TOKEN)
      }

      exponentialCounter += 1
      $exponentialCounter.innerText = exponentialCounter.toString()
    },
    shouldContinue: () => linearCounter < limit
  })
}

$asyncStop.onclick = () => stop = true
