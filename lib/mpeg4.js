// jshint esversion:6
// jshint asi:true

'use strict'

const box = require('./boxes').box
const container_box = require('./boxes').container_box

// Leaf types.
const tag_mdat = "mdat"
const tag_hdlr = "hdlr"
const tag_ftyp = "ftyp"

class mpeg4 extends container_box {
  constructor () {
    super()
    this.contents = []
    this.content_size = 0
    this.header_size = 0
    this.moov_box = null
    this.free_box = null
    this.first_mdat_box = null
    this.ftyp_box = null
    this.first_mdat_position = null
  }

  static load (fh) {

    //fh.seek(0, 2)
    fh.seek(fh.size)
    let size = fh.tell()
    let contents = box.load_multiple(fh, 0, size)

    if (!contents || contents.length < 1) {
      throw new Error(`no contents for mpeg4`)
    }

    const loaded_mpeg4 = new mpeg4()
    loaded_mpeg4.contents = contents

    loaded_mpeg4.contents.forEach(element => {
      switch(element.name) {
        case 'moov':
          loaded_mpeg4.moov_box = element
        break;
        case 'free':
          loaded_mpeg4.free_box = element
        break;
        case 'mdat':
          loaded_mpeg4.first_mdat_box = element
        break;
        case 'ftyp':
          loaded_mpeg4.ftyp_box = element
        break;
        default:
          console.log(`unrecognized element ${element.name} in mpeg4`);
      }
    })

    if (!loaded_mpeg4.moov_box) {
      throw new Error(`no moov box in ${fh}`)
    }

    if (!loaded_mpeg4.first_mdat_box) {
      throw new Error(`no mdat box in ${fh}`)
    }

    loaded_mpeg4.first_mdat_position = loaded_mpeg4.first_mdat_box.position
    loaded_mpeg4.first_mdat_position += loaded_mpeg4.first_mdat_box.header_size

    loaded_mpeg4.content_size = 0
    loaded_mpeg4.contents.forEach(element => {
      loaded_mpeg4.content_size += element.size()
    })

    return loaded_mpeg4
  }

  merge (element) {
    throw new Error(`cannot merge mpeg4`)
  }

  print_structure () {
    console.log(`mpeg4 [ ${this.content_size} ]`)

    for (let i = 0; i < this.contents.length; i += 1) {
      let next_indent = " ├──"
      if (i === (this.contents.length-1)) {
        next_indent = " └──"
      }

      this.contents[i].print_structure(next_indent)
    }
  }

  save (in_fh, out_fh) {
    this.resize()
    let new_position = 0

    for (let i = 0; i < this.contents.length; i += 1) {
      let element = this.contents[i];
      if (element.name === tag_mdat) {
        new_position += element.header_size
        // break
      }
      new_position += element.size()
    }

    const delta = new_position - this.first_mdat_position
    this.contents.forEach(element => element.save(in_fh, out_fh, delta) )
  }
}

module.exports = mpeg4
