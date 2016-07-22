#! /usr/bin/env node

(() => {
  'use strict'
  const sphericalMetadata = require('../index')
  const program = require('commander')

  const NO_CROP = true
  const CROP_HELP = 'Must specify 6 integers in the form of "w:h:f_w:f_h:x:y"' +
    'f_w=FullPanoWidthPixels f_h=FullPanoHeightPixels ' +
    'x=CroppedAreaLeftPixels y=CroppedAreaTopPixels'
  const NO_STEREO = true

  let firstFileArg, otherFileArgs

  function validateCropObject () {
    if (program.crop === NO_CROP) {
      return false
    } else {
      let cropVals = program.crop.split(':')
      let cropObj = {
        CroppedAreaImageWidthPixels: cropVals[0],
        CroppedAreaImageHeightPixels: cropVals[1],
        FullPanoWidthPixels: cropVals[2],
        FullPanoHeightPixels: cropVals[3],
        CroppedAreaLeftPixels: cropVals[4],
        CroppedAreaTopPixels: cropVals[5]
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
      return cropObj
    }
  }

  program
    .option('-i, --inject', 'Inject Metadata. This requires a source file and destination file')
    .option('-c, --crop <crop-region>', 'crop region.' + CROP_HELP, /^(\d+:\d+:\d+:\d+:\d+:\d+)$/i)
    .option('-s, --stereo <stereo-mode>', 'Inject stereo mode information. Must be one of (none | top-bottom | left-right)', /^(none|top-bottom|left-right)$/i)
    .option('-w --software <stitching-software>', 'The software used for stitching the video', 'Bubl')
    .arguments('<file> [otherFiles...]')
    .action((file, otherFiles) => {
      firstFileArg = file
      otherFileArgs = otherFiles
    })
    .parse(process.argv)

  if (program.inject) {
    if (firstFileArg === null || otherFileArgs.length !== 1) {
      console.log('Injecting metadata requires both an input file and a single output file.')
      return
    }
    let opts = {
      stereo: 'none',
      projection: 'equirectangular',
      software: program.software,
      sourceCount: 4,
      source: firstFileArg,
      destination: otherFileArgs[0]
    }

    if (program.crop) {
      let cropObj = validateCropObject()
      if (!cropObj) {
        console.log('Invalid crop argument\n' + CROP_HELP)
        return
      } else {
        opts.crop = cropObj
      }
    }

    if (program.stereo) {
      if (program.stereo === NO_STEREO) {
        console.log('Invalid stereo argument')
        return
      } else {
        opts.stereo = program.stereo
      }
    }

    sphericalMetadata.injectMetadata(opts).then(() => {
      console.log('Metadata Injection Complete')
    }, (err) => {
      console.log('Error occurred during metadata injection')
      console.log(err)
    })
  } else {
    if (!firstFileArg) {
      console.log('Must specify atleast 1 file to print metadata for')
      return
    }

    otherFileArgs = otherFileArgs || []
    otherFileArgs.unshift(firstFileArg)
    otherFileArgs.forEach((file) => {
      sphericalMetadata.readMetadata(file).then((xmlData) => {
        console.log(xmlData)
        console.log('Successfully Read Metadata from ', file)
      })
    })
  }
})()
