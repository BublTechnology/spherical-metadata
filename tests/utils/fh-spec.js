const test = require('ava')
const FH = require('../../utils/fh')
const fs = require('fs')
const shortid = require('shortid')

test.cb('read -- throws when file not inited', (t) => {
  const fakeFileName = shortid() + '.txt'
  fs.openSync(fakeFileName, 'w+')

  const fh = new FH(fakeFileName)
  t.throws(fh.read.bind(fh, 0))

  fh.init(() => {
    t.notThrows(fh.read.bind(fh, 0))
    fh.close()
    t.throws(fh.read.bind(fh, 0))
    fs.unlink(fakeFileName)
    t.end()
  })
})

test.cb('read -- auto seeks to next location in file', (t) => {
  const fakeFileName = shortid() + '.txt'
  fs.openSync(fakeFileName, 'w+')
  const fh = new FH(fakeFileName)

  fh.init(() => {
    fh.read(12)
    t.is(fh.tell(), 12)
    fh.read(12)
    t.is(fh.tell(), 24)
    fh.read(6)
    t.is(fh.tell(), 30)
    fh.seek(10)
    fh.read(1)
    t.is(fh.tell(), 11)
    fs.unlink(fakeFileName)
    t.end()
  })
})

test.cb('read -- reads from file starting at current position', (t) => {
  const fakeFileName = shortid() + '.txt'
  const fd = fs.openSync(fakeFileName, 'w+')

  const buffer = new Buffer(28)
  buffer.write('teenage mutant ninja turtles')
  fs.writeSync(fd, buffer, 0, 28, 0)

  const fh = new FH(fakeFileName)

  fh.init(() => {
    fh.seek(0)
    t.is(fh.read(8).toString('utf-8'), 'teenage ')
    t.is(fh.read(7).toString('utf-8'), 'mutant ')
    fh.seek(21)
    t.is(fh.read(7).toString('utf-8'), 'turtles')
    fh.seek(15)
    t.is(fh.read(5).toString('utf-8'), 'ninja')
    fs.unlink(fakeFileName)
    t.end()
  })
})

test.cb('write -- throws when not inited', (t) => {
  const fakeFileName = shortid() + '.txt'
  fs.openSync(fakeFileName, 'w+')

  const buffer = new Buffer(8)
  buffer.write('teenage ')
  const fh = new FH(fakeFileName)
  t.throws(fh.write.bind(fh, buffer))

  fh.init(() => {
    t.notThrows(fh.write.bind(fh, buffer))
    fs.unlink(fakeFileName)
    t.end()
  })
})

test.cb('write -- writes at current position', (t) => {
  const fakeFileName = shortid() + '.txt'
  const fd = fs.openSync(fakeFileName, 'w+')
  const fh = new FH(fakeFileName)

  fh.init(() => {
    const buffer = new Buffer(28)
    buffer.write('teenage mutant ninja turtles')
    fh.write(buffer)

    const kittens = new Buffer(7)
    kittens.write('kittens')
    fh.seek(21)
    fh.write(kittens)

    const kittenBuffer = new Buffer(7)
    fs.readSync(fd, kittenBuffer, 0, 7, 21)
    t.is(kittenBuffer.toString('utf-8'), 'kittens')

    const elderly = new Buffer(7)
    elderly.write('elderly')
    fh.seek(0)
    fh.write(elderly)

    const elderlyBuffer = new Buffer(7)
    fs.readSync(fd, elderlyBuffer, 0, 7, 0)
    t.is(elderlyBuffer.toString('utf-8'), 'elderly')

    const wholeBuffer = new Buffer(28)
    fs.readSync(fd, wholeBuffer, 0, 28, 0)
    t.is(wholeBuffer.toString('utf-8'), 'elderly mutant ninja kittens')

    fs.unlink(fakeFileName)
    t.end()
  })
})

test.cb('write -- seeks to next position', (t) => {
  const fakeFileName = shortid() + '.txt'
  fs.openSync(fakeFileName, 'w+')
  const fh = new FH(fakeFileName)

  fh.init(() => {
    const teenage = new Buffer(8)
    teenage.write('teenage ')
    fh.write(teenage)
    t.is(fh.tell(), 8)
    const mutant = new Buffer(7)
    mutant.write('mutant ')
    fh.write(mutant)
    t.is(fh.tell(), 15)
    const ninja = new Buffer(6)
    ninja.write('ninja ')
    fh.write(ninja)
    t.is(fh.tell(), 21)
    const turtles = new Buffer(7)
    turtles.write('turtles')
    fh.write(turtles)
    t.is(fh.tell(), 28)
    fs.unlink(fakeFileName)
    t.end()
  })
})

test.cb('seek -- throws when file not inited', (t) => {
  const fakeFileName = shortid() + '.txt'
  fs.openSync(fakeFileName, 'w+')

  const fh = new FH(fakeFileName)
  t.throws(fh.seek.bind(fh, 0))

  fh.init(() => {
    t.notThrows(fh.seek.bind(fh, 0))
    fh.close()
    t.throws(fh.seek.bind(fh, 0))
    fs.unlink(fakeFileName)
    t.end()
  })
})

test.cb('seek', (t) => {
  const fakeFileName = shortid() + '.txt'
  fs.openSync(fakeFileName, 'w+')
  const fh = new FH(fakeFileName)

  fh.init(() => {
    fh.seek(12)
    t.is(fh.tell(), 12)
    fh.seek(24)
    t.is(fh.tell(), 24)
    fh.seek(6)
    t.is(fh.tell(), 6)
    fs.unlink(fakeFileName)
    t.end()
  })
})
