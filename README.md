# 造一个 promise-poller 轮子

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bda03255712c489982d392828356a73d~tplv-k3u1fbpfcp-zoom-1.image)

> 项目代码：https://github.com/Haixiang6123/my-promise-poller
>
> 预览链接：[http://yanhaixiang.com/my-promise-poller/](http://yanhaixiang.com/my-promise-poller/)
>
> 参考轮子：https://www.npmjs.com/package/promise-poller

轮询，一个前端非常常见的操作，然而对于很多人来说第一反应竟然还是用 `setInterval` 来实现， `setInterval` 作为轮询是不稳定的。下面就带大家一起写一个 promise-poller 的轮子吧。

## 从零开始

先从上面说的 `setInterval` 的方法开始写起，一个最 Low 的轮询如下：

```ts
const promisePoller = (taskFn: Function, interval: number) => {
  setInterval(() => {
    taskFn();
  }, interval)
}
```

第一个参数为轮询任务，第二参数为时间间隔，so easy。

刚刚也说了，`setInterval` 是不稳定的，详见：[为什么setTimeout()比setInterval()稳定](https://blog.csdn.net/chiuwingyan/article/details/80322289)。用 `setTimeout` 迭代调用来做轮询会更稳定，面试题常见操作，so easy。

```ts
interface Options {
  taskFn: Function
  interval: number
}

const promisePoller = (options: Options) => {
  const {taskFn, interval} = options

  const poll = () => {
    setTimeout(() => {
      taskFn()
      poll()
    }, interval)
  }

  poll()
}
```

上面还把入参封成 `Options` 类型，更容易扩展入参类型。

这样的代码我们还是不满意，受不了 `setTimeout` 里又一个回调，太丑了。因此，可以把 `setTimeout` 封装成一个 `delay` 函数，delay 完成再去调用 `poll` 就好了。

```ts
export const delay = (interval: number) => new Promise(resolve => {
  setTimeout(resolve, interval)
})

const promisePoller = (options: Options) => {
  const {taskFn, interval} = options

  const poll = () => {
    taskFn()

    delay(interval).then(poll) // 使用 delay 替换 setTimeout 的回调
  }

  poll()
}
```

是不是变干净多了？

## promisify

即然这个轮子的名字都带有 "promise"，那 `promisePoller` 函数肯定要返回一个 Promise 呀。这一步就要把这个函数 promisify。

首先返回一个 Promise。

```ts
const promisePoller = (options: Options) => {
  const {taskFn, interval, masterTimeout} = options

  return new Promise((resolve, reject) => { // 返回一个 Promise
    const poll = () => {
      const result = taskFn()

      delay(interval).then(poll)
    }

    poll()
  })
}
```

那问题来了：什么时候该 reject ？什么时候该 resolve 呢？自然是整个轮询失败就 reject，整个轮询成功就 resolve 呗。

先看 reject 时机：整个轮询失败一般是 timeout 了就凉了呗，所以这里加个 `masterTimeout` 到 `Options` 中，表示整体轮询的超时时间，再为整个轮询过程加个 `setTimeout` 计时器。

```ts
interface Options {
  taskFn: Function
  interval: number
  masterTimeout?: number // 整个轮询过程的 timeout 时长
}

const promisePoller = (options: Options) => {
  const {taskFn, interval, masterTimeout} = options

  let timeoutId

  return new Promise((resolve, reject) => {
    if (masterTimeout) {
      timeoutId = setTimeout(() => {
        reject('Master timeout') // 整个轮询超时了
      }, masterTimeout)
    }

    const poll = () => {
      taskFn()

      delay(interval).then(poll)
    }

    poll()
  })
}
```

再看 resolve 时机：执行到最后一次轮询任务就说明整个轮询成功了嘛，那怎么才知道这是后一次的轮询任务呢？呃，我们并不能知道，只能通过调用方告诉我们才知道，所以加个 `shouldContinue` 的回调让调用方告诉我们当前是否应该继续轮询，如果不继续就是最后一次了嘛。

```ts
interface Options {
  taskFn: Function
  interval: number
  shouldContinue: (err: string | null, result: any) => boolean // 当次轮询后是否需要继续
  masterTimeout?: number
}

const promisePoller = (options: Options) => {
  const {taskFn, interval, masterTimeout, shouldContinue} = options

  let timeoutId: null | number

  return new Promise((resolve, reject) => {
    if (masterTimeout) {
      timeoutId = window.setTimeout(() => {
        reject('Master timeout') // 整个轮询过程超时了
      }, masterTimeout)
    }

    const poll = () => {
      const result = taskFn()

      if (shouldContinue(null, result)) { 
        delay(interval).then(poll)  // 继续轮询
      } else {
        if (timeoutId !== null) {  // 不需要轮询，有 timeoutId 则清除
          clearTimeout(timeoutId)
        }
        
        resolve(result) // 最后一个轮询任务了，结束并返回最后一次 taskFn 的结果
      }
    }

    poll()
  })
}
```

至此，一个 Promisify 后的 poller 函数已经大体完成了。还有没有得优化呢？有！

## 轮询任务的 timeout

刚刚提到 `masterTimeout`，相对地，也应该有轮询单个任务的 `timeout`，所以，在 `Options` 里加个 `taskTimeout` 字段吧。

不对，等等！上面好像我们默认 `taskFn` 是同步的函数呀，timeout 一般针对异步函数设计的，这也提示了我们 `taskFn` 应该也要支持异步函数才行。所以，在调用 `taskFn` 的时候，要将其结果 promisify，然后对这个 promise 进行 timeout 的检测。

```ts
interface Options {
  taskFn: Function
  interval: number
  shouldContinue: (err: string | null, result: any) => boolean
  masterTimeout?: number
  taskTimeout?: number // 轮询任务的 timeout
}

// 判断该 promise 是否超时了
const timeout = (promise: Promise<any>, interval: number) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject('Task timeout'), interval)

    promise.then(result => {
      clearTimeout(timeoutId)
      resolve(result)
    })
  })
}

const promisePoller = (options: Options) => {
  const {taskFn, interval, masterTimeout, taskTimeout, shouldContinue} = options

  let timeoutId: null | number

  return new Promise((resolve, reject) => {
    if (masterTimeout) {
      timeoutId = window.setTimeout(() => {
        reject('Master timeout')
      }, masterTimeout)
    }

    const poll = () => {
      let taskPromise = Promise.resolve(taskFn()) // 将结果 promisify

      if (taskTimeout) {
        taskPromise = timeout(taskPromise, taskTimeout) // 检查该轮询任务是否超时了
      }

      taskPromise
        .then(result => {
          if (shouldContinue(null, result)) {
            delay(interval).then(poll)
          } else {
            if (timeoutId !== null) {
              clearTimeout(timeoutId)
            }
            resolve(result)
          }
        })
        .catch(error => {

        })
    }

    poll()
  })
}
```

上面一共完成了三步：
1. 将 `taskFn` 的结果 promisify
2. 添加 `timeout` 函数用于判断 `taskFn` 是否超时（对于同步函数其实一般来说不会 timeout，因为结果是马上返回的）
3. 判断 `taskFn` 是否超时，超时了直接 reject，会走到 `taskPromise` 的 catch 里

那如果真的超时了，`timeout` reject 了之后干啥呢？当然是告诉主流程的轮询说：哎，这个任务超时了，我要不要重试一下啊。因此，这里又要引入一个重试的功能了。

## 重试

首先，在 `Options` 加个 `retries` 的字段表示可重试的次数。

```ts
interface Options {
  taskFn: Function 
  interval: number 
  shouldContinue: (err: string | null, result?: any) => boolean 
  masterTimeout?: number 
  taskTimeout?: number 
  retries?: number // 轮询任务失败后重试次数
}
```

接着在 catch 里，判断 `retries` 是否为 0（重试次数还没用完） 和 `shouldContinue` 的值是否为 `true`（我真的要重试啊），以此来确定是否真的需要重试。只有两者都为 `true` 时才重试。

```ts
const promisePoller = (options: Options) => {
  ...
  let rejections: Array<Error | string> = []
  let retriesRemain = retries

  return new Promise((resolve, reject) => {
    ...
    const poll = () => {
      ...

      taskPromise
        .then(result => {
          ...
        })
        .catch(error => {
          rejections.push(error) // 加入 rejections 错误列表
          
          if (--retriesRemain === 0 || !shouldContinue(error)) { // 判断是否需要重试
            reject(rejections) // 不重试，直接失败
          } else {
            delay(interval).then(poll); // 重试
          }
        })
    }

    poll()
  })
}
```

上面还添加 `rejections` 变量用于存放多个 error 信息。这样的设计是因为有可能 10 个任务里 2 个失败了，那最后就要把 2 个失败的信息都返回，因此需要一个数组存放错误信息。

## 主动停止轮询

虽然 `shouldContinue` 已经可以有效地控制流程是否要中止，但是每次都要等下一次轮询开始之后才会判断，这样未免有点被动。如果可以在 `taskFn` 执行的时候就主动停止，那 `promisePoller` 就更灵活了。

而 `taskFn` 有可能是同步函数或者异步函数，对于同步函数，我们规定 `return false` 就停止轮询，对于异步函数，规定 `reject("CANCEL_TOKEN")` 就停止轮询。函数改写如下：

```ts
const CANCEL_TOKEN = 'CANCEL_TOKEN'

const promisePoller = (options: Options) => {
  const {taskFn, interval, masterTimeout, taskTimeout, shouldContinue, retries} = options

  let polling = true
  let timeoutId: null | number
  let rejections: Array<Error | string> = []
  let retriesRemain = retries

  return new Promise((resolve, reject) => {
    if (masterTimeout) {
      timeoutId = window.setTimeout(() => {
        reject('Master timeout')
        polling = false
      }, masterTimeout)
    }

    const poll = () => {
      let taskResult = taskFn()

      if (taskResult === false) { // 结束同步任务
        taskResult = Promise.reject(taskResult)
        reject(rejections)
        polling = false
      }

      let taskPromise = Promise.resolve(taskResult)

      if (taskTimeout) {
        taskPromise = timeout(taskPromise, taskTimeout)
      }

      taskPromise
        .then(result => {
          ...
        })
        .catch(error => {
          if (error === CANCEL_TOKEN) { // 结束异步任务
            reject(rejections)
            polling = false
          }

          rejections.push(error)

          if (--retriesRemain === 0 || !shouldContinue(error)) {
            reject(rejections)
          } else if (polling) { // 再次重试时，需要检查 polling 是否为 true
            delay(interval).then(poll);
          }
        })
    }

    poll()
  })
}
```

上面代码判断了 `taskFn` 的返回值是否为 `false`，在 catch 里判断 error 是否为 `CANCEL_TOKEN`。如果 `taskFn` 主动要求中止轮询，那么设置 `polling` 为 `false` 并 reject 整个流程。

这里还有个细节是：为了提高安全性，在重试的那里要再检查一次 `polling` 是否为 `true` 才重新 `poll`。

## 轮询策略

目前我们设计的都是线性轮询的，一个 `interval` 搞定。为了提高扩展性，我们再提供另外 2 种轮询策略：linear-backoff 和 exponential-backoff，分别对 interval 的线性递增和指数递增，而非匀速不变。

先定好策略的一些默认参数：

```ts
export const strategies = {
  'fixed-interval': {
    defaults: {
      interval: 1000
    },
    getNextInterval: function(count: number, options: Options) {
      return options.interval;
    }
  },

  'linear-backoff': {
    defaults: {
      start: 1000,
      increment: 1000
    },
    getNextInterval: function(count: number, options: Options) {
      return options.start + options.increment * count;
    }
  },

  'exponential-backoff': {
    defaults: {
      min: 1000,
      max: 30000
    },
    getNextInterval: function(count: number, options: Options) {
      return Math.min(options.max, Math.round(Math.random() * (Math.pow(2, count) * 1000 - options.min) + options.min));
    }
  }
};
```

每种策略都有自己的参数和 `getNextInterval` 的方法，前者为起始参数，后者在轮询的时候实时获取下一次轮询的时间间隔。因为有了起始参数，`Options` 的参数也要改动一下。

```ts
type StrategyName = 'fixed-interval' | 'linear-backoff' | 'exponential-backoff'

interface Options {
  taskFn: Function
  shouldContinue: (err: Error | null, result?: any) => boolean // 当次轮询后是否需要继续
  strategy?: StrategyName // 轮询策略
  masterTimeout?: number
  taskTimeout?: number
  retries?: number
  // fixed-interval 策略
  interval?: number
  // linear-backoff 策略
  start?: number
  increment?: number
  // exponential-backoff 策略
  min?: number
  max?: number
}
```

在 `poll` 函数里就简单了，只需要在 `delay` 之前获取一下 nextInterval，然后 `delay(nextInterval)` 即可。

```ts
const promisePoller = (options: Options) => {
  const strategy = strategies[options.strategy] || strategies['fixed-interval'] // 获取当前的轮询策略，默认使用 fixed-interval

  const mergedOptions = {...strategy.defaults, ...options} // 合并轮询策略的初始参数

  const {taskFn, masterTimeout, taskTimeout, shouldContinue, retries = 5} = mergedOptions

  let polling = true
  let timeoutId: null | number
  let rejections: Array<Error | string> = []
  let retriesRemain = retries

  return new Promise((resolve, reject) => {
    if (masterTimeout) {
      timeoutId = window.setTimeout(() => {
        reject(new Error('Master timeout'))
        polling = false
      }, masterTimeout)
    }

    const poll = () => {
      let taskResult = taskFn()

      if (taskResult === false) {
        taskResult = Promise.reject(taskResult)
        reject(rejections)
        polling = false
      }

      let taskPromise = Promise.resolve(taskResult)

      if (taskTimeout) {
        taskPromise = timeout(taskPromise, taskTimeout)
      }

      taskPromise
        .then(result => {
          if (shouldContinue(null, result)) {
            const nextInterval = strategy.getNextInterval(retriesRemain, mergedOptions) // 获取下次轮询的时间间隔
            delay(nextInterval).then(poll)
          } else {
            if (timeoutId !== null) {
              clearTimeout(timeoutId)
            }
            resolve(result)
          }
        })
        .catch((error: Error) => {
          if (error.message === CANCEL_TOKEN) {
            reject(rejections)
            polling = false
          }

          rejections.push(error)

          if (--retriesRemain === 0 || !shouldContinue(error)) {
            reject(rejections)
          } else if (polling) {
            const nextInterval = strategy.getNextInterval(retriesRemain, options) // 获取下次轮询的时间间隔
            delay(nextInterval).then(poll);
          }
        })
    }

    poll()
  })
}
```

## 总结

这个 `promisePoller` 主要完成了：

1. 基础的轮询操作
2. 返回 promise
3. 提供主动和被动中止轮询的方法
4. 提供轮询任务重试的功能
5. 提供多种轮询策略：fixed-interval, linear-backoff, exponential-backoff

