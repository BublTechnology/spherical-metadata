// jshint esversion:6
// jshint asi:true

'use strict'

const fs = require('fs')
const child_process = require('child_process')
const path = require('path')
const jspack = require('bufferpack')

const xmldoc = require('xmldoc')
const box = require('./lib/boxes').box
const mpeg4 = require('./lib/mpeg4')

const FH = require('./utils/fh')
const tag_uuid = 'uuid'

// Leaf types.
const tag_stco = "stco"
const tag_co64 = "co64"
const tag_free = "free"
const tag_xml = "xml "

const tag_trak = "trak"

const spherical_uuid_id = new Buffer([0xff, 0xcc, 0x82, 0x63, 0xf8, 0x55, 0x4a, 0x93, 0x88, 0x14, 0x58, 0x7a, 0x02, 0x52, 0x1f, 0xdd])

// XML contents.
const rdf_prefix = ` xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" `

const spherical_xml_header = `<?xml version="1.0"?>
  <rdf:SphericalVideo xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
    xmlns:GSpherical="http://ns.google.com/videos/1.0/spherical/">`

const spherical_xml_contents = (software, projection, sourceCount) => `
  <GSpherical:Spherical>true</GSpherical:Spherical>
  <GSpherical:Stitched>true</GSpherical:Stitched>
  <GSpherical:StitchingSoftware>${software}</GSpherical:StitchingSoftware>
  <GSpherical:ProjectionType>${projection}</GSpherical:ProjectionType>
  <GSpherical:SourceCount>${sourceCount}</GSpherical:SourceCount>`

const spherical_xml_contents_top_bottom = `<GSpherical:StereoMode>top-bottom</GSpherical:StereoMode>`
const spherical_xml_contents_left_right = `<GSpherical:StereoMode>left-right</GSpherical:StereoMode>`

// Parameter order matches that of the crop option.
const spherical_xml_contents_crop_format = (w, h, panoWidth, panoHeight, croppedLeft, croppedTop) => `
      <GSpherical:CroppedAreaImageWidthPixels>${w}</GSpherical:CroppedAreaImageWidthPixels>
      <GSpherical:CroppedAreaImageHeightPixels>${h}</GSpherical:CroppedAreaImageHeightPixels>
      <GSpherical:FullPanoWidthPixels>${panoWidth}</GSpherical:FullPanoWidthPixels>
      <GSpherical:FullPanoHeightPixels>${panoHeight}</GSpherical:FullPanoHeightPixels>
      <GSpherical:CroppedAreaLeftPixels>${croppedLeft}</GSpherical:CroppedAreaLeftPixels>
      <GSpherical:CroppedAreaTopPixels>${croppedTop}</GSpherical:CroppedAreaTopPixels>`

const spherical_xml_footer = `</rdf:SphericalVideo>`

const spherical_tags_list = [
    "Spherical",
    "Stitched",
    "StitchingSoftware",
    "ProjectionType",
    "SourceCount",
    "StereoMode",
    "InitialViewHeadingDegrees",
    "InitialViewPitchDegrees",
    "InitialViewRollDegrees",
    "Timestamp",
    "CroppedAreaImageWidthPixels",
    "CroppedAreaImageHeightPixels",
    "FullPanoWidthPixels",
    "FullPanoHeightPixels",
    "CroppedAreaLeftPixels",
    "CroppedAreaTopPixels",
]

// xmldoc does not expand xmlns when parsing
// const spherical_prefix = "{http://ns.google.com/videos/1.0/spherical/}"
const spherical_prefix = "GSpherical:"

const spherical_tags = spherical_tags_list.reduce((tags, tag) => {
  tags[spherical_prefix + tag] = tag;
  return tags;
}, {});

const spherical_uuid = function(metadata) {
  // """Constructs a uuid containing spherical metadata.
  //
  // Args:
  //   metadata: String, xml to inject in spherical tag.
  //
  // Returns:
  //   uuid_leaf: a box containing spherical metadata.
  // """
  const uuid_leaf = new box()
  uuid_leaf.name = tag_uuid
  uuid_leaf.header_size = 8
  uuid_leaf.content_size = 0

  uuid_leaf.contents = Buffer.concat([spherical_uuid_id, new Buffer(metadata)]);
  uuid_leaf.content_size = uuid_leaf.contents.length

  uuid_leaf.print_structure();
  return uuid_leaf
}

const mpeg4_add_spherical = function (mpeg4_file, in_fh, metadata) {
  // """Adds a spherical uuid box to an mpeg4 file for all video tracks.
  //
  // Args:
  //   mpeg4_file: mpeg4, Mpeg4 file structure to add metadata.
  //   in_fh: file handle, Source for uncached file contents.
  //   metadata: string, xml metadata to inject into spherical tag.
  // """
  for(let i = 0; i < mpeg4_file.moov_box.contents.length; i += 1) {
    let element = mpeg4_file.moov_box.contents[i]

    if(element.name === 'trak') {
      let added = false
      element.remove('uuid')
      for (let j = 0; j < element.contents.length; j += 1) {
        let sub_element = element.contents[j]
        if (sub_element.name.toString('utf-8') !== 'mdia') {
          continue
        }

        for (let k = 0; k < sub_element.contents.length; k += 1) {

          let mdia_sub_element = sub_element.contents[k]
          if (mdia_sub_element.name.toString('utf-8') !== 'hdlr') {
            continue
          }
          let position = mdia_sub_element.content_start() + 8
          in_fh.seek(position)
          if (in_fh.read(4).toString('utf-8') === 'vide'){
            added = true
            break
          }

        } // sub_element.contents.length

        if (added) {
          return element.add(spherical_uuid(metadata))
          // if(!element.add(spherical_uuid(metadata))) {
          //   return false
          // }
          // break
        }
      }
    }
  }

  mpeg4_file.resize()
  return true
}

const exists_in_dirs = dirList => target => () => {
  let found = false;

  for (var i = 0; i < dirList.length; i += 1) {
    try {
      // append bin name to every path and check if it exists
      // .replace(/\/$/,'') removes trailing slash if one exists
      // so we get 'file/path/targetName' not ''file/path//targetName'
      if (fs.statSync(`${dirList[i].replace(/\/$/,'')}/${target}`)) {
        found = true
      }
    } catch (e) {
      // everything's cool, dont even worry about it
    }
  }

  return found;
}

const ffmpeg = exists_in_dirs(process.env.PATH.split(':'))('ffmpeg')

const ParseSphericalXML = function (contents) {

  /*
  """Prints spherical metadata for a set of xml data.

  Args:
    contents: string, spherical metadata xml contents.
  """
  */
  let parsed_xml = null;
  try {
    parsed_xml = xml_parser(contents); //new xmldoc.XmlDocument(contents)
  } catch (e) {
    let index = contents.indexOf('<rdf:SphericalVideo')

    if (index !== -1) {
      index += '<rdf:SphericalVideo'.length
      contents = contents.slice(0, index) + rdf_prefix + contents.slice(index)
      parsed_xml = new xmldoc.XmlDocument(contents)
    } else {
      console.log('WARN: no rdf prefix')
    }
  }

  if(parsed_xml !== null) {
    parsed_xml.eachChild(child => {
      let tag = child.name
      if (!tag) {
        return
      }

      if(spherical_tags[tag]) {
        if (tag.slice(0, spherical_prefix.length) === spherical_prefix) {
          tag = tag.slice(spherical_prefix.length, tag.length)
        }
        console.log(`\tFound: ${tag} = ${child.val}`);
      } else {
        console.log(`unknown tag ${tag}`);
      }
    })
  }
}

const ParseSphericalMKV = function (file_name) {
  const process = child_process.spawnSync('ffmpeg', ['-i', file_name])
  const out = process.stdout.toString('utf-8')
  const err = process.stderr.toString('utf-8')

  let index = err.toLowerCase().indexOf('spherical-video')

  if (index === -1) {
    return
  }

  const sub_err = err.slice(index)
  const lines = sub_err.split("\n")
  const xml_contents = []

  if (lines[0].indexOf(':') === -1) {
    return
  }

  // xml_contents.append(lines[0][lines[0].index(":") + 2:])
  xml_contents.push( lines[0].slice(lines[0].indexOf(":") + 2) )

  for (let i = 1; i < lines.length; i += 1) {
    let line = lines[i]
    let ind = line.indexOf(':')
    if(ind === -1) {
      continue
    }

    let prefix = line.slice(0, ind)
    if (prefix.match(/^[ ]*$/)) {
      xml_contents.push(line.slice(ind + 2))
    }
  }

  ParseSphericalXML(xml_contents.join('\n'));
}

const handleMpeg4orMKV = function (infile, mkv_func, mpeg4_func) {
  let matches = infile.match(/[.]{1}[\w]{1,5}$/)
  if (!matches) {
    throw new Error(`${infile} must have a file extension`)
  }

  let extension = matches[0]
  switch (extension.toLowerCase()) {
    case '.mkv':
    case '.webm':
      return mkv_func
    break;
    case '.mp4':
      return mpeg4_func
    break;
    default:
      console.log(`${extension} files not supported`)
      return false
  }
}

const ParseSphericalMpeg4 = function (mpeg4_file, fh) {
  /*
  """Prints spherical metadata for a loaded mpeg4 file.

  Args:
    mpeg4_file: mpeg4, loaded mpeg4 file contents.
    fh: file handle, file handle for uncached file contents.
  """
  */
  let track_num = 0
  for (let i = 0; i < mpeg4_file.moov_box.contents.length; i += 1) {
    let element = mpeg4_file.moov_box.contents[i]
    if (element.name === tag_trak) {
      track_num += 1
      for (var j = 0; j < element.contents.length; j += 1) {
        let sub_element = element.contents[j]
        let sub_element_id

        if (sub_element.name === tag_uuid) {
          if (sub_element.contents) {
            sub_element_id = sub_element.contents.slice(0, 16)
          } else {
            fh.seek(sub_element.content_start())
            sub_element_id = fh.read(16)
          }

          if(sub_element_id.toString('hex') === spherical_uuid_id.toString('hex')) {
            let contents
            if (sub_element.contents) {
              contents = sub_element.contents.slice(16).toString('utf-8')
            } else {
              contents = fh.read(sub_element.content_size - 16).toString('utf-8')
            }

            ParseSphericalXML(contents)
          }
        }
      }
    }
  }
}

const PrintMpeg4 = function (input_file) {
  let in_fh = new FH(input_file)
  in_fh.init( err => {
    if (err) {
      throw err
    }
    let mpeg4_file
    mpeg4_file = mpeg4.load(in_fh)
    ParseSphericalMpeg4(mpeg4_file, in_fh)
    in_fh.close()
  })
}

const InjectMpeg4 = function (input_file, output_file, metadata) {
  const in_fh = new FH(input_file)

  in_fh.init( err => {
    if (err) {
      throw err
    }

    const mpeg4_file = mpeg4.load(in_fh)

    if (!mpeg4_add_spherical(mpeg4_file, in_fh, metadata)) {
      throw new Error(`failed to add spherical metadata`)
    }

    ParseSphericalMpeg4(mpeg4_file, in_fh)

    const out_fh = new FH(output_file)
    out_fh.init( err => {
      if (err) {
        throw err
      }
      out_fh.seek(0)
      mpeg4_file.save(in_fh, out_fh)
      out_fh.close()
      in_fh.close()
    })
  })
}

const PrintMKV = function (input_file) {
  if (!ffmpeg()) {
    return console.log(`please install ffmpeg for mkv support`)
  }

  ParseSphericalMKV(input_file)
}

const InjectMKV = function (input_file, output_file, metadata) {
  if (!ffmpeg()) {
    return console.log(`please install ffmpeg for mkv support`)
  }

  let process = child_process.spawn('ffmpeg',
    ['-i',
    input_file,
    '-metadata:s:v',
    `spherical-video=${metadata}`,
    '-c:a',
    'copy',
    output_file
    ])
  const out = process.stdout.toString('utf-8')
  const err = process.stderr.toString('utf-8')

  ParseSphericalMKV(output_file)
}

module.exports.PrintMetadata = function (src) {
  const infile = path.normalize(src)

  try {
    let fd = fs.openSync(infile, 'r+')
    fs.close(fd)
  } catch (e) {
    throw e
  }

  let handler = handleMpeg4orMKV(infile, PrintMKV, PrintMpeg4)
  if (typeof handler === 'function') {
    handler(infile)
  }
}

const InjectMetadata = function (src, dest, metadata) {
  const infile = path.normalize(src)
  const outfile = path.normalize(dest)

  if (infile === outfile) {
    throw new Error(`input and output cannot be the same`)
  }

  try {
    let fd = fs.openSync(infile, 'r+')
    fs.close(fd)
  } catch (e) {
    throw e
  }

  let handler = handleMpeg4orMKV(infile, InjectMKV, InjectMpeg4)
  if (typeof handler === 'function') {
    handler(infile, outfile, metadata)
  }
}

function validateCropObject (cropObj) {
  let cropKeys = ['CroppedAreaImageWidthPixels',
                  'CroppedAreaImageHeightPixels',
                  'FullPanoWidthPixels',
                  'FullPanoHeightPixels',
                  'CroppedAreaLeftPixels',
                  'CroppedAreaTopPixels']

  if (cropKeys.some( key => parseInt(typeof cropObj[key], 10) !== 'number') ) {
    return false
  }

  if (cropObj.CroppedAreaImageWidthPixels <= 0 ||
      cropObj.CroppedAreaImageHeightPixels <= 0 ||
      cropObj.CroppedAreaImageWidthPixels > cropObj.FullPanoWidthPixels ||
      cropObj.CroppedAreaImageHeightPixels > cropObj.FullPanoHeightPixels ) {

    return false
  }

  const total_width = cropbj.CroppedAreaLeftPixels + cropbj.CroppedAreaImageWidthPixels // cropped_offset_left_pixels + cropped_width_pixels
  const total_height = cropObj.CroppedAreaTopPixels + cropObj.CroppedAreaImageHeightPixels //

  if (cropObj.CroppedAreaLeftPixels < 0 ||
      cropObj.CroppedAreaTopPixels < 0 ||
      total_width > cropObj.FullPanoWidthPixels ||
      total_height > cropObj.FullPanoHeightPixels) {
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
    throw new Error(`path to source file must be specified`)
  }

  if (typeof opts.destination !== 'string') {
    throw new Error(`path to destination file must be specified`)
  }

  let additional_xml = ''

  if (opts.stereo === 'top-bottom') {
    additional_xml += spherical_xml_contents_top_bottom
  } else if (opts.stereo === 'left-right') {
    additional_xml += spherical_xml_contents_left_right
  }

  if (typeof opts.crop === 'object') {
    if (validateCropObject(opts.crop)) {
      additional_xml += spherical_xml_contents_crop_format(
        opts.crop.CroppedAreaImageWidthPixels,
        opts.crop.CroppedAreaImageHeightPixels,
        opts.crop.FullPanoWidthPixels,
        opts.crop.FullPanoHeightPixels,
        opts.crop.CroppedAreaLeftPixels,
        opts.crop.CroppedAreaTopPixels)
    }
  }

  const spherical_xml_body = spherical_xml_contents(opts.software, opts.projection, opts.sourceCount)
  const spherical_xml = spherical_xml_header + spherical_xml_body + additional_xml + spherical_xml_footer
  InjectMetadata(opts.source, opts.destination, spherical_xml) // ASYNC!!
  // TODO return Promise
}
