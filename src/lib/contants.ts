type StrategyName = 'fixed-interval' | 'linear-backoff' | 'exponential-backoff'

export interface Options {
  taskFn: Function // 轮询任务
  strategy?: StrategyName // 轮询策略
  masterTimeout?: number // 整个轮询过程的 timeout
  shouldContinue: (err: Error | null, result?: any) => boolean // 当次轮询后是否需要继续
  taskTimeout?: number // 轮询任务的 timeout
  progressCallback?: (retriesRemain: number, error: Error) => unknown // 剩余次数回调
  retries?: number //轮询任务失败后重试次数
  // fixed-interval 策略
  interval?: number // 轮询周期
  // linear-backoff 策略
  start?: number
  increment?: number
  // exponential-backoff 策略
  min?: number
  max?: number
}

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
