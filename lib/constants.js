const TRAK_TYPE_VIDE = 'vide'
// Leaf types
const TAG_STCO = 'stco'
const TAG_CO64 = 'co64'
const TAG_FREE = 'free'
const TAG_MDAT = 'mdat'
const TAG_XML = 'xml '
const TAG_HDLR = 'hdlr'
const TAG_FTYP = 'ftyp'
const TAG_ESDS = 'esds'
const TAG_SOUN = 'soun'
const TAG_SA3D = 'SA3D'
// Container types
const TAG_MOOV = 'moov'
const TAG_UDTA = 'udta'
const TAG_META = 'meta'
const TAG_TRAK = 'trak'
const TAG_MDIA = 'mdia'
const TAG_MINF = 'minf'
const TAG_STBL = 'stbl'
const TAG_STSD = 'stsd'
const TAG_UUID = 'uuid'
const TAG_WAVE = 'wave'
// Sound sample descriptions
const TAG_NONE = 'NONE'
const TAG_RAW_ = 'raw '
const TAG_TWOS = 'twos'
const TAG_SOWT = 'sowt'
const TAG_FL32 = 'fl32'
const TAG_FL64 = 'fl64'
const TAG_IN24 = 'in24'
const TAG_IN32 = 'in32'
const TAG_ULAW = 'ulaw'
const TAG_ALAW = 'alaw'
const TAG_LPCM = 'lpcm'
const TAG_MP4A = 'mp4a'
const SOUND_SAMPLE_DESCRIPTIONS = [
  TAG_NONE,
  TAG_RAW_,
  TAG_TWOS,
  TAG_SOWT,
  TAG_FL32,
  TAG_FL64,
  TAG_IN24,
  TAG_IN32,
  TAG_ULAW,
  TAG_ALAW,
  TAG_LPCM,
  TAG_MP4A
]
const CONTAINERS_LIST = [
  TAG_MDIA,
  TAG_MINF,
  TAG_MOOV,
  TAG_STBL,
  TAG_STSD,
  TAG_TRAK,
  TAG_UDTA,
  TAG_WAVE
].join(SOUND_SAMPLE_DESCRIPTIONS)

module.exports = {
  TRAK_TYPE_VIDE,
  // Leaf types
  TAG_STCO,
  TAG_CO64,
  TAG_FREE,
  TAG_MDAT,
  TAG_XML,
  TAG_HDLR,
  TAG_FTYP,
  TAG_ESDS,
  TAG_SOUN,
  TAG_SA3D,
  // Container types
  TAG_MOOV,
  TAG_UDTA,
  TAG_META,
  TAG_TRAK,
  TAG_MDIA,
  TAG_MINF,
  TAG_STBL,
  TAG_STSD,
  TAG_UUID,
  TAG_WAVE,
  // Sound sample descriptions
  TAG_NONE,
  TAG_RAW_,
  TAG_TWOS,
  TAG_SOWT,
  TAG_FL32,
  TAG_FL64,
  TAG_IN24,
  TAG_IN32,
  TAG_ULAW,
  TAG_ALAW,
  TAG_LPCM,
  TAG_MP4A,
  SOUND_SAMPLE_DESCRIPTIONS,
  CONTAINERS_LIST
}

