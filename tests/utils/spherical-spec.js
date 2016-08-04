const test = require('ava')
const configToXML = require('../../utils/spherical').configToXML
const xmldoc = require('xmldoc')
const xmlToConfig = require('../../utils/spherical').xmlToConfig

test('configToXML', (t) => {
  const expected = `<?xml version=\"1.0\"?><rdf:SphericalVideo\nxmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"\nxmlns:GSpherical=\"http://ns.google.com/videos/1.0/spherical/\"><GSpherical:Spherical>true</GSpherical:Spherical><GSpherical:Stitched>true</GSpherical:Stitched><GSpherical:StereoMode>top-bottom</GSpherical:StereoMode><GSpherical:StitchingSoftware>Ricoh Theta</GSpherical:StitchingSoftware><GSpherical:ProjectionType>cubic</GSpherical:ProjectionType><GSpherical:SourceCount>2</GSpherical:SourceCount></rdf:SphericalVideo>`
  const xml = configToXML({
    stereo: 'top-bottom',
    software: 'Ricoh Theta',
    projection: 'cubic',
    sourceCount: 2
  })

  t.is(xml, expected)
})

test('configToXML -- stereo', (t) => {
  const topBottomXml = new xmldoc.XmlDocument(configToXML({ stereo: 'top-bottom' }))
  t.is(topBottomXml.children.find((child) => child.name === 'GSpherical:StereoMode').val, 'top-bottom')

  const leftRightXml = new xmldoc.XmlDocument(configToXML({ stereo: 'left-right' }))
  t.is(leftRightXml.children.find((child) => child.name === 'GSpherical:StereoMode').val, 'left-right')

  const nostereoXml = new xmldoc.XmlDocument(configToXML({ stereo: 'none' }))
  t.is(nostereoXml.children.find((child) => child.name === 'GSpherical:StereoMode'), undefined)

  const nonsensetXml = new xmldoc.XmlDocument(configToXML({ stereo: 'absolutenonsense' }))
  t.is(nonsensetXml.children.find((child) => child.name === 'GSpherical:StereoMode'), undefined)
})

test('configToXML -- software', (t) => {
  const bublXml = new xmldoc.XmlDocument(configToXML({ software: 'Bubl' }))
  t.is(bublXml.children.find((child) => child.name === 'GSpherical:StitchingSoftware').val, 'Bubl')

  const ricohXml = new xmldoc.XmlDocument(configToXML({ software: 'Ricoh' }))
  t.is(ricohXml.children.find((child) => child.name === 'GSpherical:StitchingSoftware').val, 'Ricoh')
})

test('configToXML -- projection', (t) => {
  const equirectXml = new xmldoc.XmlDocument(configToXML({ projection: 'equirectangular' }))
  t.is(equirectXml.children.find((child) => child.name === 'GSpherical:ProjectionType').val, 'equirectangular')

  const cubicXml = new xmldoc.XmlDocument(configToXML({ projection: 'cubic' }))
  t.is(cubicXml.children.find((child) => child.name === 'GSpherical:ProjectionType').val, 'cubic')
})

test('configToXML -- source count', (t) => {
  const twoXml = new xmldoc.XmlDocument(configToXML({ sourceCount: 2 }))
  t.is(twoXml.children.find((child) => child.name === 'GSpherical:SourceCount').val, '2')

  const fourXml = new xmldoc.XmlDocument(configToXML({ sourceCount: '4' }))
  t.is(fourXml.children.find((child) => child.name === 'GSpherical:SourceCount').val, '4')
})

test('configToXML -- crop', (t) => {
  const cropXml = new xmldoc.XmlDocument(configToXML({
    crop: {
      CroppedAreaImageWidthPixels: 200,
      CroppedAreaImageHeightPixels: 100,
      FullPanoWidthPixels: 500,
      FullPanoHeightPixels: 250,
      CroppedAreaLeftPixels: 50,
      CroppedAreaTopPixels: 150
    }
  }))

  t.is(cropXml.children.find((child) => child.name === 'GSpherical:CroppedAreaImageWidthPixels').val, '200')
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:CroppedAreaImageHeightPixels').val, '100')
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:FullPanoWidthPixels').val, '500')
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:FullPanoHeightPixels').val, '250')
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:CroppedAreaLeftPixels').val, '50')
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:CroppedAreaTopPixels').val, '150')
})

test('configToXML -- invalid crop', (t) => {
  const cropXml = new xmldoc.XmlDocument(configToXML({
    crop: {
      CroppedAreaImageWidthPixels: 200,
      CroppedAreaImageHeightPixels: 100,
      FullPanoWidthPixels: 500,
      FullPanoHeightPixels: 250,
      CroppedAreaLeftPixels: 350,
      CroppedAreaTopPixels: 150
    }
  }))

  t.is(cropXml.children.find((child) => child.name === 'GSpherical:CroppedAreaImageWidthPixels'), undefined)
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:CroppedAreaImageHeightPixels'), undefined)
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:FullPanoWidthPixels'), undefined)
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:FullPanoHeightPixels'), undefined)
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:CroppedAreaLeftPixels'), undefined)
  t.is(cropXml.children.find((child) => child.name === 'GSpherical:CroppedAreaTopPixels'), undefined)
})

test('xmlToConfig', (t) => {
  const rawXml = `
  <?xml version="1.0"?>
    <rdf:SphericalVideo xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:GSpherical="http://ns.google.com/videos/1.0/spherical/">
      <GSpherical:Spherical>true</GSpherical:Spherical>
      <GSpherical:Stitched>true</GSpherical:Stitched>
      <GSpherical:StereoMode>left-right</GSpherical:StereoMode>
      <GSpherical:StitchingSoftware>Samsung</GSpherical:StitchingSoftware>
      <GSpherical:ProjectionType>equirectangular</GSpherical:ProjectionType>
      <GSpherical:SourceCount>12</GSpherical:SourceCount>
    </rdf:SphericalVideo>`

  const config = xmlToConfig(rawXml)

  t.is(config.spherical, true)
  t.is(config.stitched, true)
  t.is(config.stereo, 'left-right')
  t.is(config.software, 'Samsung')
  t.is(config.projection, 'equirectangular')
  t.is(config.sourceCount, '12')
})

test('xmlToConfig -- no xml', (t) => {
  const config = xmlToConfig()
  t.deepEqual(config, {})
})

test('xmlToConfig -- invalid xml', (t) => {
  const invalidXml = '<notxml></atall>'
  const config = xmlToConfig(invalidXml)
  t.deepEqual(config, {})
})

test('xmlToConfig -- no rdf', (t) => {
  const noRDFXml = `<?xml version="1.0"?>
  <NotRDF>
    <GSpherical:Spherical>true</GSpherical:Spherical>
    <GSpherical:Stitched>true</GSpherical:Stitched>
  </NotRDF>`
  const config = xmlToConfig(noRDFXml)
  t.deepEqual(config, {})
})

test('xmlToConfig -- crop', (t) => {
  const rawXML = `
  <?xml version="1.0"?>
    <rdf:SphericalVideo xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:GSpherical="http://ns.google.com/videos/1.0/spherical/">
      <GSpherical:Spherical>true</GSpherical:Spherical>
      <GSpherical:Stitched>true</GSpherical:Stitched>
      <GSpherical:CroppedAreaImageWidthPixels>700</GSpherical:CroppedAreaImageWidthPixels>
      <GSpherical:CroppedAreaImageHeightPixels>350</GSpherical:CroppedAreaImageHeightPixels>
      <GSpherical:FullPanoWidthPixels>420</GSpherical:FullPanoWidthPixels>
      <GSpherical:FullPanoHeightPixels>210</GSpherical:FullPanoHeightPixels>
      <GSpherical:CroppedAreaLeftPixels>60</GSpherical:CroppedAreaLeftPixels>
      <GSpherical:CroppedAreaTopPixels>80</GSpherical:CroppedAreaTopPixels>
    </rdf:SphericalVideo>`

  const config = xmlToConfig(rawXML)
  t.is(config.crop.CroppedAreaImageWidthPixels, 700)
  t.is(config.crop.CroppedAreaImageHeightPixels, 350)
  t.is(config.crop.FullPanoWidthPixels, 420)
  t.is(config.crop.FullPanoHeightPixels, 210)
  t.is(config.crop.CroppedAreaLeftPixels, 60)
  t.is(config.crop.CroppedAreaTopPixels, 80)
})
