'use strict'

module.exports = function paddedBuffer (fmt, val) {
  let size = 4
  let offset = 0
  if (fmt === '>Q') {
    size = 8
    offset = 4
  }
  let newBuf = new Buffer(size)
  newBuf.fill(0)
  newBuf.writeInt32BE(val, offset)
  return newBuf
}

