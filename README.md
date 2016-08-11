# spherical-metadata
A port of google's [spatial media tools](https://github.com/google/spatial-media/tree/master/spatialmedia) to JS

[![CircleCI](https://circleci.com/gh/BublTechnology/spherical-metadata.svg?style=shield&circle-token=67c42a16a71bb1ff80fad3e089b3e621aac1ad5e)](https://circleci.com/gh/BublTechnology/spherical-metadata)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)


## Using the library

### injectMetadata
Inject spherical metadata into an MP4 file

```javascript
const sphericalMetadata = require('spherical-metadata')

sphericalMetadata.injectMetadata({
  source: 'equi.MP4',
  destination: 'equi-with-metadata.MP4',
  software: 'Bubl',
  projection: 'equirectangular',
  sourceCount: 4
}).catch((err) => {
  console.log(`Error occurred while injecting metadata: ${err}`)
}).then(() => {
  console.log("Metadata injection completed")
})

```

#### Options
```javascript
{
  stereo: 'top-bottom' || 'left-right',
  crop: {
    CroppedAreaImageWidthPixels: pixelValue,
    CroppedAreaImageHeightPixels: pixelValue,
    FullPanoWidthPixels: pixelValue,
    FullPanoHeightPixels: pixelValue,
    CroppedAreaLeftPixels: pixelValue,
    CroppedAreaTopPixels: pixelValue
  },
  software: String,
  projection: 'equirectangular',
  sourceCount: Number,
  source: filePath,
  destination: filePath
}
```

### readMetadata
Read the spherical metadata currently in an MP4 file and return an options object

```javascript
const sphericalMetadata = require('spherical-metadata')
sphericalMetadata.readMetadata(value).then((data) => {
  console.log(data)
})
```


### License

[Apache 2.0](https://github.com/BublTechnology/spherical-metadata/blob/master/LICENSE)
