'use strict'

const ContainerBox = require('./container')
const CONSTANTS = require('./constants')

class Mpeg4 extends ContainerBox {
  constructor () {
    super()
    this.contents = []
    this.content_size = 0
    this.headerSize = 0
    this.moovBox = null
    this.freeBox = null
    this.firstMdatBox = null
    this.ftypBox = null
    this.firstMdatPosition = null
    this.padding = 0
  }

  static load (fh) {
    fh.seek(fh.size)
    let size = fh.tell()
    let contents = ContainerBox.loadMultiple(fh, 0, size)

    if (!contents || contents.length < 1) {
      throw new Error('no contents for mpeg4')
    }

    const loadedMpeg4 = new Mpeg4()
    loadedMpeg4.contents = contents

    loadedMpeg4.contents.forEach((element) => {
      switch (element.name) {
        case CONSTANTS.TAG_MOOV:
          loadedMpeg4.moovBox = element
          break
        case CONSTANTS.TAG_FREE:
          loadedMpeg4.freeBox = element
          break
        case CONSTANTS.TAG_MDAT:
          if (!loadedMpeg4.firstMdatBox) {
            loadedMpeg4.firstMdatBox = element
          }
          break
        case CONSTANTS.TAG_FTYP:
          loadedMpeg4.ftypBox = element
          break
        case CONSTANTS.TAG_UUID:
          break
        default:
          console.log(`unrecognized element ${element.name} in mpeg4`)
      }
    })

    if (!loadedMpeg4.moovBox) {
      throw new Error(`no moov box in ${fh}`)
    }

    if (!loadedMpeg4.firstMdatBox) {
      throw new Error(`no mdat box in ${fh}`)
    }

    loadedMpeg4.firstMdatPosition = loadedMpeg4.firstMdatBox.position
    loadedMpeg4.firstMdatPosition += loadedMpeg4.firstMdatBox.headerSize

    loadedMpeg4.content_size = 0
    loadedMpeg4.contents.forEach((element) => {
      loadedMpeg4.content_size += element.size()
    })

    return loadedMpeg4
  }

  merge (element) {
    throw new Error('cannot merge mpeg4')
  }

  save (inFh, outFh) {
    this.resize()
    let newPosition = 0

    for (let i = 0; i < this.contents.length; i += 1) {
      let element = this.contents[i]
      if (element.name === CONSTANTS.TAG_MDAT) {
        newPosition += element.headerSize
        break
      }
      newPosition += element.size()
    }
    const delta = newPosition - this.firstMdatPosition
    this.contents.forEach((element) => {
      element.save(inFh, outFh, delta)
    })
  }
}

module.exports = Mpeg4
