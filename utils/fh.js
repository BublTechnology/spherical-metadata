'use strict'

const fs = require('fs')

class FH {
  constructor (file) {
    this.inited = false
    this.file = file
    this.position = 0
    this.buffer = null
  }

  init (callback) {
    fs.open(this.file, 'r+', (err, fd) => {
      if (err && typeof callback === 'function') {
        return callback(err)
      }

      this.fd = fd
      this.size = fs.readFileSync(this.file).byteLength
      this.buffer = new Buffer(this.size)

      if (this.size === 0) {
        this.inited = true

        if (typeof callback === 'function') {
          callback(null)
        }
        return
      }

      fs.read(this.fd, this.buffer, 0, this.buffer.length, 0, (err, bytes) => {
        if (err) {
          return callback(err)
        }

        this.inited = true
        this.seek(bytes)

        if (typeof callback === 'function') {
          callback(null)
        }
      })
    })
  }

  read (len) {
    if (!this.inited) {
      throw new Error(`${this} must be initialized before calling read`)
    }

    let slice = this.buffer.slice(this.position, this.position + len)
    this.seek(this.position + len)
    return slice
  }

  write (data) {
    if (!this.inited) {
      throw new Error(`${this} must be initialized before calling write`)
    }
    // buffer
    // source offset
    // source length
    // target offset
    fs.writeSync(this.fd, data, 0, data.byteLength, this.position)
    this.seek(this.position + data.byteLength)
  }

  seek (position) {
    if (!this.inited) {
      throw new Error(`${this.file} must be initialized before calling seek`)
    }
    this.position = position
  }

  tell () {
    return this.position
  }

  close () {
    this.inited = false
    fs.close(this.fd)
  }
}

module.exports = FH
