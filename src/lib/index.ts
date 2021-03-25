import {delay} from './utils'

interface Options {
  taskFn: Function // 轮询任务
  interval: number // 轮询周期
  masterTimeout?: number // 整个轮询过程的 timeout
  shouldContinue?: (err: string | null, result: any) => boolean // 当次轮询后是否需要继续
}

const defaultOptions: Partial<Options> = {
  shouldContinue: (err: string | null) => !err
}

const promisePoller = (options: Options) => {
  // 合并默认设置
  options = {...defaultOptions, ...options}

  const {taskFn, interval, masterTimeout, shouldContinue} = options

  let timeoutId: null | number

  return new Promise((resolve, reject) => {
    if (masterTimeout) {
      timeoutId = window.setTimeout(() => {
        reject('Master timeout')
      }, masterTimeout)
    }

    const poll = () => {
      const result = taskFn()

      if (shouldContinue(null, result)) {
        // 继续轮询
        delay(interval).then(poll)
      } else {
        // 不需要轮询，有 timeoutId 则清除
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
        // 结束并返回最后一次 taskFn 的结果
        resolve(result)
      }
    }

    poll()
  })
}

export default promisePoller
