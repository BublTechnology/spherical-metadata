const warn = require('./fancyOut').warn('Crop Dimensions')

function validateCropObject (cropObj) {
  if (cropObj.CroppedAreaImageWidthPixels <= 0 || cropObj.CroppedAreaImageHeightPixels <= 0) {
    warn('cropped area must have width and height greater than 0')
    return false
  }

  if (cropObj.CroppedAreaImageWidthPixels > cropObj.FullPanoWidthPixels ||
      cropObj.CroppedAreaImageHeightPixels > cropObj.FullPanoHeightPixels) {
    warn('cropped area is greater than image size')
    return false
  }

  const rightEdge = cropObj.CroppedAreaLeftPixels + cropObj.CroppedAreaImageWidthPixels
  const bottomEdge = cropObj.CroppedAreaTopPixels + cropObj.CroppedAreaImageHeightPixels

  if (cropObj.CroppedAreaLeftPixels < 0 || cropObj.CroppedAreaTopPixels < 0) {
    warn('cropped area must start within image')
    return false
  }

  if (rightEdge > cropObj.FullPanoWidthPixels || bottomEdge > cropObj.FullPanoHeightPixels) {
    warn('cropped area is out of bounds')
    return false
  }

  return cropObj
}

module.exports = validateCropObject
