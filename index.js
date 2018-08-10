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

    this.opts = Object.assign({
      signals: ['SIGINT', 'SIGTERM'],
      timeout: 30000
    }, opts)

    this._init()
  }

  _init () {
    this._listener()
    this.opts.signals.forEach(signal => {
      signal && process.on(signal, () => this.close(signal))
    })
  }
  _listener () {
    this.server.on('request', (req, res) => {
      res.on('finish', () => {
        if (this.isShutDown) {
          this._destroySocket(req.socket)
        }
      })
    })

    this.server.on('connection', (socket) => {
      let id = this.total++
      socket._connectionId = id
      this.connections[id] = socket

      socket.on('close', () => {
        delete this.connections[id]
      })
    })

    process.on('exit', () => {
      if (this.isShutDown && this.opts.after && isFunction(this.opts.after)) {
        this.opts.after()
      }
    })
  }
  _destroySocket (socket) {
    socket.destroy()
    delete this.connections[socket._connectionId]
  }
  _destroyAllSocket () {
    Object.keys(this.connections).forEach(key => {
      this._destroySocket(this.connections[key])
    })
  }
  _serverClose () {
    return new Promise((resolve, reject) => {
      this.server.getConnections((err, count) => {
        if (err) return reject(err)
        if (!count) return resolve()

        this.server.close(function (_err) {
          if (_err) return reject(_err)
          resolve()
        })
      })
    })
  }
  close () {
    if (this.isShutDown) {
      return
    }
    this.isShutDown = true

    if (this.opts.timeout) {
      setTimeout(() => {
        console.log(' timed out of' + this.opts.timeout + 'ms! forced shutdown !')
        process.exit(1)
      }, this.opts.timeout)
    }
    if (this.opts.before && isFunction(this.opts.before)) {
      this.opts.before().then(() => this._serverClose()).then(() => {
        process.exit(0)
      }).catch((err) => {
        console.error('shutdown got err:', err)
        process.exit(1)
      })
    } else {
      this._serverClose().then(() => {
        process.exit(0)
      }).catch((err) => {
        console.error('shutdown got err:', err)
        process.exit(1)
      })
    }
  }
}

function isFunction (target) {
  return Object.prototype.toString.call(target) === '[object Function]'
}

module.exports = ShutDown
