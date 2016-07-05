// jshint esversion:6
// jshint asi:true
'use strict'

const jspack = require('bufferpack')
const containers = require('./containers')
const tagStco = 'stco'
const tagCo64 = 'co64'
/*
    Args:
      inFh: file handle, source to read index table from.
      outFh: file handle, destination for index file.
      box: box, stco/co64 box to copy.
      mode: string, bit packing mode for index entries.
      modeLength: int, number of bytes for index entires.
      delta: int, offset change for index entries.
*/
const indexCopy = (mode, modeLength) => (inFh, outFh, box, delta) => {
  delta = delta || 0
  let fh = inFh

  if (!box.contents) {
    fh.seek(box.contentStart())
  } else {
    // TODO implement this
    throw new Error('implement reading from box.contents')
    // fh = Buffer.from(box.contents) //StringIO.StringIO(box.contents)
  }

  // '>' =  big endian
  // 'I' = unsigned int
  // read(4) = read until byte 4
  const header = jspack.unpack('>I', fh.read(4))[0]
  const values = jspack.unpack('>I', fh.read(4))[0]

  const newContents = []
  newContents.push(hexBuffer('>I', header))
  newContents.push(hexBuffer('>I', values))

  for (let i = 0; i < values; i += 1) {
    let content = fh.read(modeLength)
    content = jspack.unpack(mode, content)[0] + delta
    newContents.push(hexBuffer(mode, content))
  }

  outFh.write(Buffer.concat(newContents))
}

const stcoCopy = indexCopy('>I', 4)
const co64Copy = indexCopy('>Q', 8)

const hexBuffer = (fmt, val) => {
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
/*
Copies a block of data from inFh to outFh.

Args:
  inFh: file handle, source of uncached file contents.
  outFh: file handle, destination for saved file.
  size: int, amount of data to copy.
*/
function tagCopy (inFh, outFh, size) {
  // On 32-bit systems reading / writing is limited to 2GB chunks.
  // To prevent overflow, read/write 64 MB chunks.
  const blockSize = 64 * 1024 * 1024
  while (size > blockSize) {
    let contents = inFh.read(blockSize)
    outFh.write(contents)
    size = size - blockSize
  }

  let contents = inFh.read(size)
  outFh.write(contents)
}

// MPEG4 box contents and behaviour true for all boxes.
class Box {
  constructor () {
    this.name = ''
    this.position = 0
    this.headerSize = 0
    this.content_size = 0
    this.contents = null
  }

  contentStart () {
    return this.position + this.headerSize
  }

  /*
  Loads the box located at a position in a mp4 file.

  Args:
    fh: file handle, input file handle.
    position: int or None, current file position.

  Returns:
    box: box, box from loaded file location or None.
  */
  static load (fh, position, end) {
    if (typeof position === 'undefined') {
      position = fh.tell()
    }

    end = end || 0
    fh.seek(position)

    let headerSize = 8
    let size = jspack.unpack('>I', fh.read(4))[0]
    const name = fh.read(4).toString('utf-8')
    console.log(`${name} is ${size}`)

    if (containers.indexOf(name) !== -1) {
      return ContainerBox.load(fh, position, end)
    }

    if (size === 1) {
      size = jspack.unpack('>Q', fh.read(8))[0]
      headerSize = 16
    }

    if (size < 8) {
      throw new Error(`invalid size in ${name} at ${position}`)
    }

    if (position + parseInt(size, 10) > end) {
      throw new Error(`Leaf box size for ${name} exceeds bounds.`)
    }

    const newBox = new Box()

    newBox.name = name
    newBox.position = position
    newBox.headerSize = headerSize
    newBox.content_size = size - headerSize
    newBox.contents = null

    return newBox
  }

  static loadMultiple (fh, position, end) {
    const loaded = []
    position = position || 0
    end = end || 0
    while (position < end) {
      let newBox = Box.load(fh, position, end)

      if (newBox === null) {
        throw new Error('failed to load box')
      }
      loaded.push(newBox)
      position = newBox.position + newBox.size()
    }

    return loaded
  }

  /*
  Save box contents prioritizing set contents and specialized
    behaviour for stco/co64 boxes.

    Args:
      inFh: file handle, source to read box contents from.
      outFh: file handle, destination for written box contents.
      delta: int, index update amount.

  */
  save (inFh, outFh, delta) {
    if (this.headerSize === 16) {
      outFh.write(jspack.pack('>I', 1))
      outFh.write(new Buffer(this.name))
      outFh.write(jspack.pack('>Q', this.size()))
    } else if (this.headerSize === 8) {
      outFh.write(hexBuffer('>I', this.size()))
      outFh.write(new Buffer(this.name))
    }

    if (this.contentStart()) {
      // console.log('content start')
      inFh.seek(this.contentStart())
    }

    if (this.name === tagStco) {
      stcoCopy(inFh, outFh, this, delta)
    } else if (this.name === tagCo64) {
      co64Copy(inFh, outFh, this, delta)
    } else if (this.contents !== null) {
      outFh.write(this.contents)
    } else {
      tagCopy(inFh, outFh, this.content_size)
    }
  }

  set (newContents) {
    this.contents = newContents
    this.content_size = this.contents.length
  }

  size () {
    return this.headerSize + this.content_size
  }
}

class ContainerBox extends Box {
  constructor () {
    super()
    this.name = ''
    this.position = 0
    this.headerSize = 0
    this.content_size = 0
    this.contents = []
  }

  static load (fh, position, end) {
    if (typeof position === 'undefined') {
      position = fh.tell()
    }

    // console.log('== SEEK position')
    fh.seek(position)

    let headerSize = 8
    let size = jspack.unpack('>I', fh.read(4))[0]
    const name = fh.read(4).toString('utf-8')

    if (containers.indexOf(name) === -1) {
      throw new Error(`name ${name} does not exist in containers`)
    }

    if (size === 1) {
      size = jspack.unpack('>Q', fh.read(8))[0]
    }

    if (size < 8) {
      throw new Error(`invalid size in ${name} at ${position}`)
    }

    if (position + size > end) {
      throw new Error('container box size exceeds bounds')
    }

    const newBox = new ContainerBox()
    newBox.name = name
    newBox.position = position
    newBox.headerSize = headerSize
    newBox.content_size = size - headerSize
    newBox.contents = Box.loadMultiple(fh, position + headerSize, position + size)

    if (!newBox.contents) {
      return null
    }

    return newBox
  }

  resize () {
    // Recomputes the box size and recurses on contents.
    this.content_size = 0
    this.contents.forEach((element) => {
      if (element instanceof ContainerBox) {
        element.resize()
      }
      this.content_size += element.size()
    })
  }

  remove (tag) {
    const newContents = []
    this.content_size = 0
    this.contents.forEach((element) => {
      if (element.name !== tag) {
        newContents.push(element)
        if (element instanceof ContainerBox) {
          element.remove(tag)
        }
        this.content_size += element.size()
      }
    })
    this.contents = newContents
  }

  add (element) {
    for (let key in this.contents) {
      let content = this.contents[key]
      if (content.name === element.name) {
        if (content instanceof ContainerBox) {
          return content.merge(element)
        }
        // merge element?

        throw new Error('not sure about merging elements')
      }
    }

    this.contents.push(element)
    return true
  }

  merge (element) {
    if (this.name !== element.name) {
      throw new Error(`${this.name} cannot merge with ${element.name}`)
    }

    if (!element instanceof ContainerBox) {
      throw new Error(`cannot merge ${typeof element}`)
    }

    for (let key in this.contents) {
      let subElement = this.contents[key]
      if (!this.add(subElement)) {
        return false
      }
    }
    return true
  }

  save (inFh, outFh, delta) {
    if (this.headerSize === 16) {
      outFh.write(jspack.pack('>I', 1))
      outFh.write(new Buffer(this.name))
      outFh.write(jspack.pack('>Q', this.size()))
    } else if (this.headerSize === 8) {
      outFh.write(hexBuffer('>I', this.size()))
      outFh.write(new Buffer(this.name))
    }

    for (let key in this.contents) {
      let element = this.contents[key]
      element.save(inFh, outFh, delta)
    }
  }
}

module.exports = {
  Box,
  ContainerBox
}
