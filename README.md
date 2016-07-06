# spherical-metadata

[![CircleCI](https://circleci.com/gh/BublTechnology/spherical-metadata.svg?style=shield&circle-token=67c42a16a71bb1ff80fad3e089b3e621aac1ad5e)](https://circleci.com/gh/BublTechnology/spherical-metadata)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)


```javascript
const sphericalMetadata = require('spherical-metadata')

sphericalMetadata.InjectMetadata({
  source: 'equi.MP4',
  destination: 'equi-with-metadata.MP4',
  software: 'Bubl',
  projection: 'equirectangular',
  sourceCount: 4
})

```
