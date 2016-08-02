const test = require('ava')
const Box = require('../../lib/box')

test('constructor', (t) => {
  const b = new Box()

  t.is(b.name, '')
  t.is(b.position, 0)
  t.is(b.headerSize, 0)
  t.is(b.contentSize, 0)
  t.is(b.contents, null)
})

test('contentStart', (t) => {
  const b = new Box()

  b.position = 12
  b.headerSize = 100
  t.is(b.contentStart(), 112)
})

test('size', (t) => {
  const b = new Box()
  b.headerSize = 12
  b.contentSize = 122
  t.is(b.size(), 134)
})
