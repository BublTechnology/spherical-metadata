'use strict'

const xmldoc = require('xmldoc')

module.exports.UUID_ID = new Buffer([0xff, 0xcc, 0x82, 0x63, 0xf8, 0x55, 0x4a, 0x93, 0x88, 0x14, 0x58, 0x7a, 0x02, 0x52, 0x1f, 0xdd])

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
const OBJECT_CROP_KEY = 'crop'
const RDF_PREFIX = ' xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" '

function xmlToObject (xmlKey) {
  return Object.keys(OBJECT_TO_XML_MAP).find((objectKey) => {
    return OBJECT_TO_XML_MAP[objectKey] === xmlKey
  })
}

function configToXML (config) {
  let xmlBody = SPHERICAL_XML_BODY
  Object.keys(config).forEach((key) => {
    if (OBJECT_TO_XML_MAP[key]) {
      if (key === 'stereo' && config.stereo === 'none') return

      let xmlTag = SPHERICAL_PREFIX + OBJECT_TO_XML_MAP[key]
      xmlBody += `<${xmlTag}>${config[key]}</${xmlTag}>`
    } else if (key === OBJECT_CROP_KEY) {
      Object.keys(config[key]).forEach((cropKey) => {
        let xmlTag = SPHERICAL_PREFIX + cropKey
        xmlBody += `<${xmlTag}>${config[key][cropKey]}</${xmlTag}>`
      })
    }
  })
  return HEADER + xmlBody + FOOTER
}

function xmlToConfig (xmlData) {
  let parsedXml = null
  let configObj = {}
  try {
    parsedXml = new xmldoc.XmlDocument(xmlData)
  } catch (e) {
    let index = xmlData.indexOf('<rdf:SphericalVideo')

    if (index !== -1) {
      index += '<rdf:SphericalVideo'.length
      xmlData = xmlData.slice(0, index) + RDF_PREFIX + xmlData.slice(index)
      parsedXml = new xmldoc.XmlDocument(xmlData)
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

      if (tag.slice(0, SPHERICAL_PREFIX.length) === SPHERICAL_PREFIX) {
        tag = tag.slice(SPHERICAL_PREFIX.length, tag.length)
      }

      let objectKey = xmlToObject(tag)
      if (objectKey) {
        configObj[objectKey] = child.val
      }
    })
  }
  return configObj
}

module.exports = {
  configToXML,
  xmlToConfig
}
