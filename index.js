'use strict'

const path = require('path')

const Box = require('./lib/box')
const Mpeg4 = require('./lib/mpeg4')
const CONSTANTS = require('./lib/constants')
const FH = require('./utils/fh')
const spherical = require('./utils/spherical')

const SPHERICAL_UUID_ID = new Buffer([0xff, 0xcc, 0x82, 0x63, 0xf8, 0x55, 0x4a, 0x93, 0x88, 0x14, 0x58, 0x7a, 0x02, 0x52, 0x1f, 0xdd])

const SphericalUuid = function (metadata) {
  // Constructs a uuid containing spherical metadata.
  //
  // Args:
  //   metadata: String, xml to inject in spherical tag.
  //
  // Returns:
  //   uuidLeaf: a box containing spherical metadata.
  const uuidLeaf = new Box()
  uuidLeaf.name = CONSTANTS.TAG_UUID
  uuidLeaf.headerSize = 8
  uuidLeaf.content_size = 0

  uuidLeaf.contents = Buffer.concat([SPHERICAL_UUID_ID, new Buffer(metadata)])
  uuidLeaf.content_size = uuidLeaf.contents.length

  return uuidLeaf
}

function mpeg4AddSpherical (mpeg4File, inFh, metadata) {
  // Adds a spherical uuid box to an mpeg4 file for all video tracks.
  //
  // Args:
  //   mpeg4File: mpeg4, Mpeg4 file structure to add metadata.
  //   inFh: file handle, Source for uncached file contents.
  //   metadata: string, xml metadata to inject into spherical tag.
  for (let i = 0; i < mpeg4File.moovBox.contents.length; i += 1) {
    let element = mpeg4File.moovBox.contents[i]

    if (element.name === CONSTANTS.TAG_TRAK) {
      let added = false
      element.remove(CONSTANTS.TAG_UUID)
      for (let j = 0; j < element.contents.length; j += 1) {
        let subElement = element.contents[j]
        if (subElement.name.toString('utf-8') !== CONSTANTS.TAG_MDIA) {
          continue
        }

        for (let k = 0; k < subElement.contents.length; k += 1) {
          let mdiaSubElement = subElement.contents[k]
          if (mdiaSubElement.name.toString('utf-8') !== CONSTANTS.TAG_HDLR) {
            continue
          }
          let position = mdiaSubElement.contentStart() + 8
          inFh.seek(position)
          if (inFh.read(4).toString('utf-8') === CONSTANTS.TRAK_TYPE_VIDE) {
            added = true
            break
          }
        } // subElement.contents.length

        if (added) {
          if (!element.add(SphericalUuid(metadata))) {
            return false
          }
        }
      }
    }
  }

  mpeg4File.resize()
  return true
}

function parseSphericalMpeg4 (mpeg4File, fh) {
  /*
    Prints spherical metadata for a loaded mpeg4 file.
    Args:
      mpeg4File: mpeg4, loaded mpeg4 file contents.
      fh: file handle, file handle for uncached file contents.
  */
  let trackNum = 0
  for (let i = 0; i < mpeg4File.moovBox.contents.length; i += 1) {
    let element = mpeg4File.moovBox.contents[i]
    if (element.name === CONSTANTS.TAG_TRAK) {
      trackNum += 1
      for (var j = 0; j < element.contents.length; j += 1) {
        let subElement = element.contents[j]
        let subElementId

        if (subElement.name === CONSTANTS.TAG_UUID) {
          if (subElement.contents) {
            subElementId = subElement.contents.slice(0, 16)
          } else {
            fh.seek(subElement.contentStart())
            subElementId = fh.read(16)
          }

          if (subElementId.toString('hex') === SPHERICAL_UUID_ID.toString('hex')) {
            let contents
            if (subElement.contents) {
              contents = subElement.contents.slice(16).toString('utf-8')
            } else {
              contents = fh.read(subElement.content_size - 16).toString('utf-8')
            }

            return contents
          }
        }
      }
    }
  }
}

function injectMpeg4Metadata (inputFile, outputFile, metadata) {
  return new Promise((resolve, reject) => {
    const inFh = new FH(inputFile)

    inFh.init((err) => {
      if (err) {
        reject(err)
      }

      const mpeg4File = Mpeg4.load(inFh)

      if (!mpeg4AddSpherical(mpeg4File, inFh, metadata)) {
        reject(new Error('failed to add spherical metadata'))
      }

      parseSphericalMpeg4(mpeg4File, inFh)

      const outFh = new FH(outputFile)
      outFh.init((err) => {
        if (err) {
          reject(err)
        }
        outFh.seek(0)
        mpeg4File.save(inFh, outFh)
        outFh.close()
        inFh.close()
        resolve()
      })
    })
  })
}

function extractMetadata (src) {
  return new Promise((resolve, reject) => {
    const inputFile = path.normalize(src)

    let inFh = new FH(inputFile)
    inFh.init((err) => {
      if (err) {
        reject(err)
      }
      let mpeg4File = Mpeg4.load(inFh)
      let xmlData = parseSphericalMpeg4(mpeg4File, inFh)
      inFh.close()
      resolve(xmlData)
    })
  })
}

module.exports.readMetadata = function (src) {
  return extractMetadata(src).then((xmlData) => {
    return spherical.xmlToConfig(xmlData)
  })
}

module.exports.injectMetadata = function (opts) {
  const generatedXML = spherical.configToXML(opts)
  return injectMpeg4Metadata(opts.source, opts.destination, generatedXML)
}
