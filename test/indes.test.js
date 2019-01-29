const http = require('http')
const chai = require('chai')
const assert = chai.assert
const url = require('url')
const ShutDown = require('../')
const request = require('supertest')

let server = http.createServer((req, res) => {
  let urlObj = url.parse(req.url)
  if (urlObj.pathname === '/test') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    // 模拟一个慢请求,2秒后返回
    setTimeout(() => {
      res.write(JSON.stringify({
        code: 200,
        data: 'test'
      }));
      res.end();
    }, 2000)
  }
})

server.listen(3333, () => {
  console.log('ready')
})

describe('测试http-server-shutdow', function() {
  it('关机后应当等待请求完毕再关闭应用，关闭时done应当被调用', function(done) {
    this.timeout(5000)
    new ShutDown(server, // 传入 server = app.listen(...)
      {
        signals: ['SIGINT','SIGTERM'],
        timeout: 3000,
        before: function () { // 在关机前的处理函数中模拟一个请求
          return new Promise((resolve, reject) => {
            request(server)
              .get('/test')
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json')
              .expect(200) // 应当等请求返回后执行关机
              .then((res) => {
                assert.deepEqual(res.body, { code: 200, data: 'test' })
                resolve()
              })
              .catch(reject)
          })
        },
        after: function () { // 关机后的处理函数， 仅处理同步方法
          done()
        },
        errCb: function (e) {
          e && console.log(e.message || 'unknown error')
        }
      })

    // 模拟用户关机
    process.kill(process.pid, ['SIGINT'])
    
  })
})