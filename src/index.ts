import promisePoller from './lib/index'
import {CANCEL_TOKEN} from "./lib/utils"

const $start = document.querySelector<HTMLButtonElement>('#start')
const $stop = document.querySelector<HTMLButtonElement>('#stop')
const $asyncStop = document.querySelector<HTMLButtonElement>('#async-stop')

const $fixedCounter = document.querySelector<HTMLParagraphElement>('#fixed-counter')
const $linearCounter = document.querySelector<HTMLParagraphElement>('#linear-counter')
const $exponentialCounter = document.querySelector<HTMLParagraphElement>('#exponential-counter')

let fixedCounter = 0
let linearCounter = 0
let exponentialCounter = 0

let stop = false
let asyncStop = false

const limit = 99999

$start.onclick = async () => {
  promisePoller({
    strategy: 'fixed-interval',
    taskFn: async () => {
      if (asyncStop) {
        throw new Error(CANCEL_TOKEN)
      }

      fixedCounter += 1
      $fixedCounter.innerText = fixedCounter.toString()

      return !stop
    },
    shouldContinue: () => fixedCounter < limit,
  })
  promisePoller({
    strategy: 'linear-backoff',
    taskFn : async () => {
      if (asyncStop) {
        throw new Error(CANCEL_TOKEN)
      }

      linearCounter += 1
      $linearCounter.innerText = linearCounter.toString()

      return !stop
    },
    shouldContinue: () => linearCounter < limit
  })
  promisePoller({
    strategy: 'exponential-backoff',
    taskFn : async () => {
      if (asyncStop) {
        throw new Error(CANCEL_TOKEN)
      }

      exponentialCounter += 1
      $exponentialCounter.innerText = exponentialCounter.toString()

      return !stop
    },
    shouldContinue: () => linearCounter < limit
  })
}

$stop.onclick = () => stop = true
$asyncStop.onclick = () => asyncStop = true
