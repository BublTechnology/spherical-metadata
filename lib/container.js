'use strict'

const jspack = require('bufferpack')
const CONSTANTS = require('./constants')
const hexBuffer = require('../utils/paddedBuffer')
const Box = require('./box')

class ContainerBox extends Box {
  constructor (padding) {
    super()
    this.name = ''
    this.position = 0
    this.headerSize = 0
    this.content_size = 0
    this.contents = []
    this.padding = padding || 0
  }

  static load (fh, position, end) {
    if (typeof position === 'undefined') {
      position = fh.tell()
    }

    fh.seek(position)
    let headerSize = 8
    let sizeHeader = fh.read(4)
    let size = jspack.unpack('>I', sizeHeader)[0]
    const name = fh.read(4).toString('utf-8')

    let isBox = (CONSTANTS.CONTAINERS_LIST.indexOf(name) === -1)
    isBox = isBox || (name === CONSTANTS.TAG_MP4A && size === 12)

    if (isBox) {
      let newBox = Box.load(fh, position, end)
      return newBox
    }

    if (size === 1) {
      size = jspack.unpack('>Q', fh.read(8))[0]
      headerSize = 16
    }

    if (size < 8) {
      throw new Error(`invalid size in ${name} at ${position}`)
    }

    if (position + size > end) {
      throw new Error('container box size exceeds bounds')
    }

    let padding = 0
    if (name === CONSTANTS.TAG_STSD) {
      padding = 8
    }
    if (CONSTANTS.SOUND_SAMPLE_DESCRIPTIONS.indexOf(name) !== -1) {
      let currentPos = fh.tell()
      fh.seek(currentPos + 8)
      let sampleDescriptionVersion = jspack.unpack('>h', fh.read(2))[0]
      fh.seek(currentPos)

      if (sampleDescriptionVersion === 0) {
        padding = 28
      } else if (sampleDescriptionVersion === 1) {
        padding = 28 + 16
      } else if (sampleDescriptionVersion === 2) {
        padding = 64
      } else {
        console.log('Unspupported Sample Description Version: ', sampleDescriptionVersion)
      }
    }

    const newBox = new ContainerBox()
    newBox.name = name
    newBox.position = position
    newBox.headerSize = headerSize
    newBox.content_size = size - headerSize
    newBox.padding = padding
    newBox.contents = ContainerBox.loadMultiple(fh, position + headerSize + padding, position + size)

    if (!newBox.contents) {
      return null
    }

    return newBox
  }

  static loadMultiple (fh, position, end) {
    const loaded = []
    position = position || 0
    end = end || 0
    while (position < end) {
      let newBox = ContainerBox.load(fh, position, end)

      if (newBox === null) {
        throw new Error('failed to load box')
      }
      loaded.push(newBox)
      position = newBox.position + newBox.size()
    }

    return loaded
  }

  resize () {
    // Recomputes the box size and recurses on contents.
    this.content_size = this.padding
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

    if (this.padding > 0) {
      inFh.seek(this.contentStart())
      Box.tagCopy(inFh, outFh, this.padding)
    }

    for (let key in this.contents) {
      let element = this.contents[key]
      element.save(inFh, outFh, delta)
    }
  }
}

module.exports = ContainerBox
