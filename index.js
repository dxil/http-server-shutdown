class ShutDown {
  constructor (server, opts = {}) {
    if (!server) {
      console.warn('can not shutdown without server!')
      return
    }

    this.server = server
    this.connections = {}
    this.total = 0
    this.isShutDown = false

    if (opts.errCb && !isFunction(opts.errCb)) {
      opts.errCb = ''
    }

    this.opts = Object.assign({
      signals: ['SIGINT', 'SIGTERM'],
      monitor: true,
      timeout: 30000,
      errCb: function (e) {
        e && console.log(e.message || 'unknown error')
      }
    }, opts)

    this._init()
  }

  _init () {
    this._listener()
    if (this.opts.monitor) { // 是否需要监听功能
      this.opts.signals.forEach(signal => {
        signal && process.on(signal, () => this.close(signal))
      })
    }
  }
  _listener () {
    this.server.on('request', (req, res) => {
      req.socket._idle = false
      res.on('finish', () => { // todo socket公用情况，使用计数优化
        req.socket._idle = true
        this._destroySocket(req.socket)
      })
    })

    this.server.on('connection', (socket) => {
      let id = this.total++
      socket._connectionId = id
      socket._idle = true
      this.connections[id] = socket

      socket.on('close', () => {
        delete this.connections[id]
      })
    })

    process.on('exit', () => {
      if (this.isShutDown && this.opts.after && this.opts.monitor && isFunction(this.opts.after)) {
        this.opts.after()
      }
    })
  }
  _destroySocket (socket) {
    if ((this.isShutDown && !this.opts.monitor) && socket._idle) {
      socket.destroy()
      delete this.connections[socket._connectionId]
    }
  }
  _destroyAllSocket () {
    Object.keys(this.connections).forEach(key => {
      this._destroySocket(this.connections[key])
    })
  }
  serverClose () {
    this.isShutDown = true
    return new Promise((resolve, reject) => {
      this.server.getConnections((err, count) => {
        if (err) return reject(err)
        if (count) {
          this._destroyAllSocket()
        }

        this.server.close(function (_err) {
          if (_err) return reject(_err)
          resolve()
        })
      })
    })
  }
  async close () {
    if (this.isShutDown) {
      return
    }

    if (this.opts.timeout) {
      setTimeout(() => {
        this.opts.errCb(new Error('timed out of ' + this.opts.timeout + 'ms! forced shutdown !'))
        process.exit(1)
      }, this.opts.timeout).unref()
    }
    if (this.opts.before && isFunction(this.opts.before)) {
      try {
        await this.opts.before()
      } catch (e) {
        this.opts.errCb(e)
        process.exit(1)
      }
      this.serverClose().then(() => {
        process.exit(0)
      }).catch((err) => {
        this.opts.errCb(err)
        process.exit(1)
      })
    } else {
      this.serverClose().then(() => {
        process.exit(0)
      }).catch((err) => {
        this.opts.errCb(err)
        process.exit(1)
      })
    }
  }
}

function isFunction (target) {
  return Object.prototype.toString.call(target) === '[object Function]'
}

// todo: 关机期间不应该再接收新的连接请求，以免导致无法关机。 需要采用立刻访问请求方式？

module.exports = ShutDown
