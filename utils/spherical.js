'use strict'

const xmldoc = require('xmldoc')
const validateCropObject = require('./validateCropObject')
const err = require('./fancyOut').err('Parsing XML')

const HEADER = `<?xml version="1.0"?><rdf:SphericalVideo
xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
xmlns:GSpherical="http://ns.google.com/videos/1.0/spherical/">`
const FOOTER = '</rdf:SphericalVideo>'
const SPHERICAL_PREFIX = 'GSpherical:'
const SPHERICAL_XML_BODY =
  '<GSpherical:Spherical>true</GSpherical:Spherical>' +
  '<GSpherical:Stitched>true</GSpherical:Stitched>'
const OBJECT_TO_XML_MAP = {
  'spherical': 'Spherical',
  'stitched': 'Stitched',
  'software': 'StitchingSoftware',
  'projection': 'ProjectionType',
  'sourceCount': 'SourceCount',
  'stereo': 'StereoMode'
}
const CROPPED_KEYS = [
  'CroppedAreaImageWidthPixels',
  'CroppedAreaImageHeightPixels',
  'FullPanoWidthPixels',
  'FullPanoHeightPixels',
  'CroppedAreaLeftPixels',
  'CroppedAreaTopPixels' ]

const OBJECT_CROP_KEY = 'crop'

function xmlToObject (xmlKey) {
  return Object.keys(OBJECT_TO_XML_MAP).find((objectKey) => {
    return OBJECT_TO_XML_MAP[objectKey] === xmlKey
  })
}

function configToXML (config) {
  let xmlBody = SPHERICAL_XML_BODY
  Object.keys(config).forEach((key) => {
    if (OBJECT_TO_XML_MAP[key]) {
      if (key === 'stereo' && (config.stereo !== 'top-bottom' && config.stereo !== 'left-right')) return

      let xmlTag = SPHERICAL_PREFIX + OBJECT_TO_XML_MAP[key]
      xmlBody += `<${xmlTag}>${config[key]}</${xmlTag}>`
    } else if (key === OBJECT_CROP_KEY) {
      if (validateCropObject(config[key])) {
        Object.keys(config[key]).forEach((cropKey) => {
          let xmlTag = SPHERICAL_PREFIX + cropKey
          xmlBody += `<${xmlTag}>${config[key][cropKey]}</${xmlTag}>`
        })
      }
    }
  })
  return HEADER + xmlBody + FOOTER
}

function xmlToConfig (xmlData) {
  let parsedXml = null
  let configObj = {}

  if (!xmlData || xmlData === '') {
    return configObj
  }

  if (xmlData.indexOf('<rdf:SphericalVideo') === -1) {
    err('no rdf prefix')
    return configObj
  }

  try {
    parsedXml = new xmldoc.XmlDocument(xmlData)
  } catch (e) {
    err(e)
    return configObj
  }

  if (parsedXml !== null) {
    parsedXml.eachChild((child) => {
      let tag = child.name

      if (tag.slice(0, SPHERICAL_PREFIX.length) === SPHERICAL_PREFIX) {
        tag = tag.slice(SPHERICAL_PREFIX.length, tag.length)
      }

      let objectKey = xmlToObject(tag)
      if (objectKey) {
        configObj[objectKey] = (child.val === 'true' || child.val === 'false') ? !!(child.val) : child.val
      } else if (CROPPED_KEYS.indexOf(tag) > -1) {
        if (!configObj.crop) {
          configObj.crop = {}
        }

        configObj.crop[tag] = parseInt(child.val, 10)
      }
    })
  }
  return configObj
}

module.exports = {
  configToXML,
  xmlToConfig
}
