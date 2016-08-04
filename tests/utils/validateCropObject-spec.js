const test = require('ava')
const validateCropObject = require('../../utils/validateCropObject')

test('cropped area wider than image', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 101,
    CroppedAreaImageHeightPixels: 100,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 0,
    CroppedAreaTopPixels: 0
  }

  t.is(validateCropObject(cropObj), false)
})

test('cropped area taller than image', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 100,
    CroppedAreaImageHeightPixels: 101,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 0,
    CroppedAreaTopPixels: 0
  }

  t.is(validateCropObject(cropObj), false)
})

test('cropped area past right edge of image', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 100,
    CroppedAreaImageHeightPixels: 100,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 1,
    CroppedAreaTopPixels: 0
  }

  t.is(validateCropObject(cropObj), false)
})

test('cropped area past bottom edge of image', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 100,
    CroppedAreaImageHeightPixels: 100,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 0,
    CroppedAreaTopPixels: 1
  }

  t.is(validateCropObject(cropObj), false)
})

test('cropped area has width of 0', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 0,
    CroppedAreaImageHeightPixels: 100,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 0,
    CroppedAreaTopPixels: 0
  }

  t.is(validateCropObject(cropObj), false)
})

test('cropped area has height of 0', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 100,
    CroppedAreaImageHeightPixels: 0,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 0,
    CroppedAreaTopPixels: 0
  }

  t.is(validateCropObject(cropObj), false)
})

test('cropped starts outside of image', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 10,
    CroppedAreaImageHeightPixels: 10,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 101,
    CroppedAreaTopPixels: 0
  }

  t.is(validateCropObject(cropObj), false)
})

test('cropped starts outside of image', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 10,
    CroppedAreaImageHeightPixels: 10,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 0,
    CroppedAreaTopPixels: -2
  }

  t.is(validateCropObject(cropObj), false)
})

test('valid crop object', (t) => {
  const cropObj = {
    CroppedAreaImageWidthPixels: 10,
    CroppedAreaImageHeightPixels: 10,
    FullPanoWidthPixels: 100,
    FullPanoHeightPixels: 100,
    CroppedAreaLeftPixels: 90,
    CroppedAreaTopPixels: 90
  }

  t.not(validateCropObject(cropObj), false)
})
