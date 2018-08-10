# server-shutdown
Nodejs server graceful shutdown 

### 用途
程序断开或重启时，已连接的socket连接将会在处理完成后再重启

### 引入
```javascript
const ShutDown = require('http-server-shutdown')
```

### API
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
      // console.log('123')
    },
    after: function () { // 关机后的处理函数
      console.log('after: server gracefull shutted down.....')
    }
  }
)
```
