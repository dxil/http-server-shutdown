# server-shutdown
Nodejs server graceful shutdown 

### 用途
程序断开或重启时，已连接的socket连接将会在处理完成后再重启

### 注意
使用pm2管理应用程序时，需要在启动时加上 `--kill-timeout 10000` 参数，否则pm2会立刻结束你的任务
```bash
pm2 start index.js --kill-timeout 10000
```

### 引入
```javascript
const ShutDown = require('http-server-shutdown')
```

### API
方式一： 如果需要使用shutDown的关闭服务，你需要使用以下方式
```javascript
  new ShutDown(server, // 传入 server = app.listen(...)
  {
    signals: ['SIGINT','SIGTERM'], // 接收的信号参数
    timeout: 30000, // 超时时间
    before: function () { // 关机前的处理函数
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(console.log('before 123'))
        }, 1000)
      })
    },
    after: function () { // 关机后的处理函数， 仅处理同步方法
      console.log('after: server gracefull shutted down.....')
    },
    errCb: function (e) { // 需要提供出现错误时的error回调，传入Error对象
      e && console.log(e.message || 'unknown error')
    }
  }
)
```

方式二： 如果不想使用shutdown关闭服务，而需要处理关闭期间的socket请求，处理并断开**所有**connection后返回（关闭期间需要自己重定向或停止接收新的请求，否则会有理论上永远处理不完connection的可能）
```javascript
let shutdown = new ShutDown(server,
  {
    monitor: false  // 控制是否需要开启监控，默认为true
  }
)
shutdown.serverClose()  // 连接全部关闭后将会返回一个promise
```

