// jshint esversion:6
// jshint asi:true

'use strict'

const fs = require('fs')
const path = require('path')

const xmldoc = require('xmldoc')
const Box = require('./lib/boxes').Box
const Mpeg4 = require('./lib/mpeg4')

const FH = require('./utils/fh')
const tagUuid = 'uuid'

const tagTrak = 'trak'

const sphericalUuidId = new Buffer([0xff, 0xcc, 0x82, 0x63, 0xf8, 0x55, 0x4a, 0x93, 0x88, 0x14, 0x58, 0x7a, 0x02, 0x52, 0x1f, 0xdd])

// XML contents.
const rdfPrefix = ' xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" '

const sphericalXMLHeader = `<?xml version='1.0'?>
  <rdf:SphericalVideo xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'
    xmlns:GSpherical='http://ns.google.com/videos/1.0/spherical/'>`

const sphericalXMLContents = (software, projection, sourceCount) => `
  <GSpherical:Spherical>true</GSpherical:Spherical>
  <GSpherical:Stitched>true</GSpherical:Stitched>
  <GSpherical:StitchingSoftware>${software}</GSpherical:StitchingSoftware>
  <GSpherical:ProjectionType>${projection}</GSpherical:ProjectionType>
  <GSpherical:SourceCount>${sourceCount}</GSpherical:SourceCount>`

const sphericalXMLContentsTopBottom = '<GSpherical:StereoMode>top-bottom</GSpherical:StereoMode>'
const sphericalXMLContentsLeftRight = '<GSpherical:StereoMode>left-right</GSpherical:StereoMode>'

// Parameter order matches that of the crop option.
const sphericalXMLContentsCropFormat = (w, h, panoWidth, panoHeight, croppedLeft, croppedTop) => `
      <GSpherical:CroppedAreaImageWidthPixels>${w}</GSpherical:CroppedAreaImageWidthPixels>
      <GSpherical:CroppedAreaImageHeightPixels>${h}</GSpherical:CroppedAreaImageHeightPixels>
      <GSpherical:FullPanoWidthPixels>${panoWidth}</GSpherical:FullPanoWidthPixels>
      <GSpherical:FullPanoHeightPixels>${panoHeight}</GSpherical:FullPanoHeightPixels>
      <GSpherical:CroppedAreaLeftPixels>${croppedLeft}</GSpherical:CroppedAreaLeftPixels>
      <GSpherical:CroppedAreaTopPixels>${croppedTop}</GSpherical:CroppedAreaTopPixels>`

const SphericalXMLFooter = '</rdf:SphericalVideo>'

const SphericalTagsList = [
  'Spherical',
  'Stitched',
  'StitchingSoftware',
  'ProjectionType',
  'SourceCount',
  'StereoMode',
  'InitialViewHeadingDegrees',
  'InitialViewPitchDegrees',
  'InitialViewRollDegrees',
  'Timestamp',
  'CroppedAreaImageWidthPixels',
  'CroppedAreaImageHeightPixels',
  'FullPanoWidthPixels',
  'FullPanoHeightPixels',
  'CroppedAreaLeftPixels',
  'CroppedAreaTopPixels'
]

// xmldoc does not expand xmlns when parsing
// const SphericalPrefix = '{http://ns.google.com/videos/1.0/spherical/}'
const SphericalPrefix = 'GSpherical:'

const SphericalTags = SphericalTagsList.reduce((tags, tag) => {
  tags[SphericalPrefix + tag] = tag
  return tags
}, {})

const SphericalUuid = function (metadata) {
  // Constructs a uuid containing spherical metadata.
  //
  // Args:
  //   metadata: String, xml to inject in spherical tag.
  //
  // Returns:
  //   uuidLeaf: a box containing spherical metadata.
  const uuidLeaf = new Box()
  uuidLeaf.name = tagUuid
  uuidLeaf.headerSize = 8
  uuidLeaf.content_size = 0

  uuidLeaf.contents = Buffer.concat([sphericalUuidId, new Buffer(metadata)])
  uuidLeaf.content_size = uuidLeaf.contents.length

  return uuidLeaf
}

const mpeg4AddSpherical = function (mpeg4File, inFh, metadata) {
  // Adds a spherical uuid box to an mpeg4 file for all video tracks.
  //
  // Args:
  //   mpeg4File: mpeg4, Mpeg4 file structure to add metadata.
  //   inFh: file handle, Source for uncached file contents.
  //   metadata: string, xml metadata to inject into spherical tag.
  for (let i = 0; i < mpeg4File.moovBox.contents.length; i += 1) {
    let element = mpeg4File.moovBox.contents[i]

    if (element.name === 'trak') {
      let added = false
      element.remove('uuid')
      for (let j = 0; j < element.contents.length; j += 1) {
        let subElement = element.contents[j]
        if (subElement.name.toString('utf-8') !== 'mdia') {
          continue
        }

        for (let k = 0; k < subElement.contents.length; k += 1) {
          let mdiaSubElement = subElement.contents[k]
          if (mdiaSubElement.name.toString('utf-8') !== 'hdlr') {
            continue
          }
          let position = mdiaSubElement.contentStart() + 8
          inFh.seek(position)
          if (inFh.read(4).toString('utf-8') === 'vide') {
            added = true
            break
          }
        } // subElement.contents.length

        if (!added) {
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

const ParseSphericalXML = function (contents) {
  let parsedXml = null
  try {
    parsedXml = new xmldoc.XmlDocument(contents)
  } catch (e) {
    let index = contents.indexOf('<rdf:SphericalVideo')

    if (index !== -1) {
      index += '<rdf:SphericalVideo'.length
      contents = contents.slice(0, index) + rdfPrefix + contents.slice(index)
      parsedXml = new xmldoc.XmlDocument(contents)
    } else {
      console.log('WARN: no rdf prefix')
    }
  }

  if (parsedXml !== null) {
    parsedXml.eachChild((child) => {
      let tag = child.name
      if (!tag) {
        return
      }

      if (SphericalTags[tag]) {
        if (tag.slice(0, SphericalPrefix.length) === SphericalPrefix) {
          tag = tag.slice(SphericalPrefix.length, tag.length)
        }
        console.log(`\tFound: ${tag} = ${child.val}`)
      } else {
        console.log(`unknown tag ${tag}`)
      }
    })
  }
}

const ParseSphericalMpeg4 = function (mpeg4File, fh) {
  /*
    Prints spherical metadata for a loaded mpeg4 file.
    Args:
      mpeg4File: mpeg4, loaded mpeg4 file contents.
      fh: file handle, file handle for uncached file contents.
  */
  let trackNum = 0
  for (let i = 0; i < mpeg4File.moovBox.contents.length; i += 1) {
    let element = mpeg4File.moovBox.contents[i]
    if (element.name === tagTrak) {
      trackNum += 1
      for (var j = 0; j < element.contents.length; j += 1) {
        let subElement = element.contents[j]
        let subElementId

        if (subElement.name === tagUuid) {
          if (subElement.contents) {
            subElementId = subElement.contents.slice(0, 16)
          } else {
            fh.seek(subElement.contentStart())
            subElementId = fh.read(16)
          }

          if (subElementId.toString('hex') === sphericalUuidId.toString('hex')) {
            let contents
            if (subElement.contents) {
              contents = subElement.contents.slice(16).toString('utf-8')
            } else {
              contents = fh.read(subElement.content_size - 16).toString('utf-8')
            }

            ParseSphericalXML(contents)
          }
        }
      }
    }
  }
}

const PrintMpeg4 = function (inputFile) {
  let inFh = new FH(inputFile)
  inFh.init((err) => {
    if (err) {
      throw err
    }
    let mpeg4File
    mpeg4File = Mpeg4.load(inFh)
    ParseSphericalMpeg4(mpeg4File, inFh)
    inFh.close()
  })
}

const InjectMpeg4 = function (inputFile, outputFile, metadata) {
  const inFh = new FH(inputFile)

  inFh.init((err) => {
    if (err) {
      throw err
    }

    const mpeg4File = Mpeg4.load(inFh)

    if (!mpeg4AddSpherical(mpeg4File, inFh, metadata)) {
      throw new Error('failed to add spherical metadata')
    }

    ParseSphericalMpeg4(mpeg4File, inFh)

    const outFh = new FH(outputFile)
    outFh.init((err) => {
      if (err) {
        throw err
      }
      outFh.seek(0)
      mpeg4File.save(inFh, outFh)
      outFh.close()
      inFh.close()
    })
  })
}

module.exports.PrintMetadata = function (src) {
  const infile = path.normalize(src)

  try {
    let fd = fs.openSync(infile, 'r+')
    fs.close(fd)
  } catch (e) {
    throw e
  }

  PrintMpeg4(infile)
}

const InjectMetadata = function (src, dest, metadata) {
  const infile = path.normalize(src)
  const outfile = path.normalize(dest)

  if (infile === outfile) {
    throw new Error('input and output cannot be the same')
  }

  try {
    let fd = fs.openSync(infile, 'r+')
    fs.close(fd)
  } catch (e) {
    throw e
  }

  InjectMpeg4(infile, outfile, metadata)
}

function validateCropObject (cropObj) {
  let cropKeys = ['CroppedAreaImageWidthPixels',
                  'CroppedAreaImageHeightPixels',
                  'FullPanoWidthPixels',
                  'FullPanoHeightPixels',
                  'CroppedAreaLeftPixels',
                  'CroppedAreaTopPixels']

  if (cropKeys.some((key) => parseInt(typeof cropObj[key], 10) !== 'number')) {
    return false
  }

  if (cropObj.CroppedAreaImageWidthPixels <= 0 ||
      cropObj.CroppedAreaImageHeightPixels <= 0 ||
      cropObj.CroppedAreaImageWidthPixels > cropObj.FullPanoWidthPixels ||
      cropObj.CroppedAreaImageHeightPixels > cropObj.FullPanoHeightPixels) {
    return false
  }

  const totalWidth = cropObj.CroppedAreaLeftPixels + cropObj.CroppedAreaImageWidthPixels // cropped_offset_left_pixels + cropped_width_pixels
  const totalHeight = cropObj.CroppedAreaTopPixels + cropObj.CroppedAreaImageHeightPixels //

  if (cropObj.CroppedAreaLeftPixels < 0 ||
      cropObj.CroppedAreaTopPixels < 0 ||
      totalWidth > cropObj.FullPanoWidthPixels ||
      totalHeight > cropObj.FullPanoHeightPixels) {
    return false
  }

  return true
}

module.exports.InjectMetadata = function (opts) {
  /* options object
  {
    stereo: 'top-bottom' || 'left-right'
    crop: { CroppedAreaImageWidthPixels,
            CroppedAreaImageHeightPixels,
            FullPanoWidthPixels,
            FullPanoHeightPixels,
            CroppedAreaLeftPixels,
            CroppedAreaTopPixels },
    software: String,
    projection: 'equirectangular',
    sourceCount: Number,
    source: filePath
    destination: filePath
  } */

  if (typeof opts.source !== 'string') {
    throw new Error('path to source file must be specified')
  }

  if (typeof opts.destination !== 'string') {
    throw new Error('path to destination file must be specified')
  }

  let additionalXml = ''

  if (opts.stereo === 'top-bottom') {
    additionalXml += sphericalXMLContentsTopBottom
  } else if (opts.stereo === 'left-right') {
    additionalXml += sphericalXMLContentsLeftRight
  }

  if (typeof opts.crop === 'object') {
    if (validateCropObject(opts.crop)) {
      additionalXml += sphericalXMLContentsCropFormat(
        opts.crop.CroppedAreaImageWidthPixels,
        opts.crop.CroppedAreaImageHeightPixels,
        opts.crop.FullPanoWidthPixels,
        opts.crop.FullPanoHeightPixels,
        opts.crop.CroppedAreaLeftPixels,
        opts.crop.CroppedAreaTopPixels)
    }
  }

  const sphericalXMLBody = sphericalXMLContents(opts.software, opts.projection, opts.sourceCount)
  const SphericalXML = sphericalXMLHeader + sphericalXMLBody + additionalXml + SphericalXMLFooter
  InjectMetadata(opts.source, opts.destination, SphericalXML) // ASYNC!!
  // TODO return Promise
}
