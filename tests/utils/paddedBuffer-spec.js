const test = require('ava')
const paddedBuffer = require('../../utils/paddedBuffer')

test('>Q', (t) => {
  let buf = new Buffer([0, 0, 0, 0, 0, 0, 0, 8])
  t.deepEqual(buf, paddedBuffer('>Q', 8))

  buf = new Buffer([0, 0, 0, 0, 0, 0, 0, 16])
  t.deepEqual(buf, paddedBuffer('>Q', 16))

  buf = new Buffer([0, 0, 0, 0, 0, 0, 0, 32])
  t.deepEqual(buf, paddedBuffer('>Q', 32))

  buf = new Buffer([0, 0, 0, 0, 0, 0, 0, 64])
  t.deepEqual(buf, paddedBuffer('>Q', 64))

  buf = new Buffer([0, 0, 0, 0, 0, 0, 0, 128])
  t.deepEqual(buf, paddedBuffer('>Q', 128))

  buf = new Buffer([0, 0, 0, 0, 0, 0, 1, 0])
  t.deepEqual(buf, paddedBuffer('>Q', 256))

  buf = new Buffer([0, 0, 0, 0, 0, 0, 2, 0])
  t.deepEqual(buf, paddedBuffer('>Q', 512))

  buf = new Buffer([0, 0, 0, 0, 0, 0, 4, 0])
  t.deepEqual(buf, paddedBuffer('>Q', 1024))
})

test('>I', (t) => {
  let buf = new Buffer([0, 0, 0, 8])
  t.deepEqual(buf, paddedBuffer('>I', 8))

  buf = new Buffer([0, 0, 0, 16])
  t.deepEqual(buf, paddedBuffer('>I', 16))

  buf = new Buffer([0, 0, 0, 32])
  t.deepEqual(buf, paddedBuffer('>I', 32))

  buf = new Buffer([0, 0, 0, 64])
  t.deepEqual(buf, paddedBuffer('>I', 64))

  buf = new Buffer([0, 0, 0, 128])
  t.deepEqual(buf, paddedBuffer('>I', 128))

  buf = new Buffer([0, 0, 1, 0])
  t.deepEqual(buf, paddedBuffer('>I', 256))

  buf = new Buffer([0, 0, 2, 0])
  t.deepEqual(buf, paddedBuffer('>I', 512))

  buf = new Buffer([0, 0, 4, 0])
  t.deepEqual(buf, paddedBuffer('>I', 1024))

  buf = new Buffer([0, 0, 8, 0])
  t.deepEqual(buf, paddedBuffer('>I', 2048))
})
