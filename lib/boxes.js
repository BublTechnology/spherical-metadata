// jshint esversion:6
// jshint asi:true
'use strict'

const fs = require('fs')
const FH = require('../utils/fh')
const jspack = require('bufferpack')
const containers = require('./containers');
const tag_stco = "stco"
const tag_co64 = "co64"
/*
    Args:
      in_fh: file handle, source to read index table from.
      out_fh: file handle, destination for index file.
      box: box, stco/co64 box to copy.
      mode: string, bit packing mode for index entries.
      mode_length: int, number of bytes for index entires.
      delta: int, offset change for index entries.
    """
    */
const index_copy = (mode, mode_length) => (in_fh, out_fh, box, delta) => {
  delta = delta || 0
  let fh = in_fh

  if (!box.contents) {
    fh.seek(box.content_start())
  } else {
    // TODO implement this
    throw new Error('implement reading from box.contents');
    // fh = Buffer.from(box.contents) //StringIO.StringIO(box.contents)
  }

  // '>' =  big endian
  // 'I' = unsigned int
  // read(4) = read until byte 4
  const header = jspack.unpack(">I", fh.read(4))[0]
  const values = jspack.unpack(">I", fh.read(4))[0]

  const new_contents = []
  new_contents.push( hexBuffer(">I", header) )
  new_contents.push( hexBuffer(">I", values) )

  for (let i = 0; i < values; i += 1) {
    let content = fh.read(mode_length)
    content = jspack.unpack(mode, content)[0] + delta
    new_contents.push(hexBuffer(mode, content))
  }

  out_fh.write( Buffer.concat(new_contents) );
}

const stco_copy = index_copy(">I", 4)
const co64_copy = index_copy(">Q", 8)

const hexBuffer = (fmt, val) => {
  let toHex = val.toString(16)
  let size = 4
  let offset = 0
  if (fmt === ">Q") {
    size = 8
    offset = 4
  }
  let newBuf = new Buffer(size)
  newBuf.fill(0)
  newBuf.writeInt32BE(val, offset)
  return newBuf
}
/*
"""Copies a block of data from in_fh to out_fh.

Args:
  in_fh: file handle, source of uncached file contents.
  out_fh: file handle, destination for saved file.
  size: int, amount of data to copy.
"""
*/
function tag_copy(in_fh, out_fh, size) {
  // On 32-bit systems reading / writing is limited to 2GB chunks.
  // To prevent overflow, read/write 64 MB chunks.
  const block_size = 64 * 1024 * 1024
  while (size > block_size) {
    let contents = in_fh.read(block_size)
    out_fh.write(contents)
    size = size - block_size
  }

  let contents = in_fh.read(size)
  out_fh.write(contents)
}

// """MPEG4 box contents and behaviour true for all boxes."""
class box {
  constructor () {
    this.name = ''
    this.position = 0
    this.header_size = 0
    this.content_size = 0
    this.contents = null
  }

  content_start () {
    return this.position + this.header_size
  }

  /*
  """Loads the box located at a position in a mp4 file.

  Args:
    fh: file handle, input file handle.
    position: int or None, current file position.

  Returns:
    box: box, box from loaded file location or None.
  """
  */
  static load (fh, position, end) {
    if(typeof position === 'undefined') {
      position = fh.tell();
    }

    end = end || 0;
    fh.seek(position)

    let header_size = 8
    let size = jspack.unpack(">I", fh.read(4))[0]
    const name = fh.read(4).toString('utf-8')

    if (containers.indexOf(name) !== -1) {
      return container_box.load(fh, position, end)
    }

    if (size === 1){
      size = jspack.unpack(">Q", fh.read(8))[0]
      header_size = 16
    }

    if (size < 8) {
      throw new Error(`invalid size in ${name} at ${position}`);
    }

    if (position + parseInt(size, 10) > end) {
      throw new Error(`Leaf box size exceeds bounds.`);
    }

    const new_box = new box()

    new_box.name = name
    new_box.position = position
    new_box.header_size = header_size
    new_box.content_size = size - header_size
    new_box.contents = null

    return new_box
  }

  static load_multiple (fh, position, end) {
    const loaded = []
    position = position || 0
    end = end || 0
    while (position < end) {
      let new_box = box.load(fh, position, end)

      if (new_box === null) {
        throw new Error(`failed to load box`)
      }
      loaded.push(new_box)
      position = new_box.position + new_box.size()
    }

    return loaded
  }

  /*
  """Save box contents prioritizing set contents and specialized
    behaviour for stco/co64 boxes.

    Args:
      in_fh: file handle, source to read box contents from.
      out_fh: file handle, destination for written box contents.
      delta: int, index update amount.
    """
    */
  save (in_fh, out_fh, delta) {

    if (this.header_size === 16) {
      out_fh.write(jspack.pack(">I", 1))
      out_fh.write(new Buffer(this.name))
      out_fh.write(jspack.pack(">Q", this.size()))
    } else if (this.header_size === 8) {
      out_fh.write(hexBuffer(">I", this.size()))
      out_fh.write(new Buffer(this.name))
    }

    if (this.content_start()) {
      in_fh.seek(this.content_start())
    }

    if (this.name == tag_stco) {
      stco_copy(in_fh, out_fh, this, delta)
    } else if (this.name === tag_co64) {
      co64_copy(in_fh, out_fh, this, delta)
    } else if (this.contents !== null) {
      out_fh.write(this.contents)
    } else {
      tag_copy(in_fh, out_fh, this.content_size)
    }
  }

  set (new_contents) {
    this.contents = new_contents
    this.content_size = contents.length
  }

  size () {
    return this.header_size + this.content_size
  }

  print_structure (indent) {
    indent = indent || ''
    console.log(`${indent}${this.name}: [${this.header_size}, ${this.content_size}]`);
  }
}


class container_box extends box {
  constructor () {
    super()
    this.name = ""
    this.position = 0
    this.header_size = 0
    this.content_size = 0
    this.contents = []
  }

  static load (fh, position, end) {
    if (typeof position === 'undefined') {
      position = fh.tell()
    }

    fh.seek(position)

    let header_size = 8
    let size = jspack.unpack(">I", fh.read(4))[0]
    const name = fh.read(4).toString('utf-8')

    if (containers.indexOf(name) === -1) {
       throw new Error(`name ${name} does not exist in containers`)
    }

    if (size === 1) {
      size = jspack.unpack(">Q", fh.read(8))[0]
    }

    if (size < 8) {
      throw new Error(`invalid size in ${name} at ${position}`)
    }

    if (position + size > end) {
      throw new Error(`container box size exceeds bounds`)
    }

    const new_box = new container_box()
    new_box.name = name
    new_box.position = position
    new_box.header_size = header_size
    new_box.content_size = size - header_size
    new_box.contents = box.load_multiple(fh, position + header_size, position + size)

    if (!new_box.contents) {
      return null;
    }

    return new_box
  }


  resize () {
    // Recomputes the box size and recurses on contents.
    this.content_size = 0
    this.contents.forEach(element => {
      if (element instanceof container_box) {
        element.resize()
      }
      this.content_size += element.size()
    })
  }

  // TODO fix this
  print_structure (indent) {
    indent = indent || ''

    console.log(`${indent}${this.name}: [${this.header_size}, ${this.content_size}]`)
    let size = this.contents.length
    let this_indent = indent
    for (let i = 0; i < this.contents.length; i += 1 ) {
      let next_indent = indent
      next_indent = next_indent.replace("├", "│")
      next_indent = next_indent.replace("└", " ")
      next_indent = next_indent.replace("─", " ")

      if (i === size - 1) {
        next_indent += " └── "
      } else {
        next_indent += " ├── "
      }

      let element = this.contents[i]
      element.print_structure(next_indent)
    }
  }

  remove (tag) {
    const new_contents = []
    this.content_size = 0
    this.contents.forEach(element => {
      if (element.name !== tag) {
        new_contents.push(element)
        if (element instanceof container_box) {
          element.remove(tag)
        }
        this.content_size += element.size()
      }
    })
    this.contents = new_contents
  }

  add (element) {

    for (let key in this.contents) {
      let content = this.contents[key]
      if (content.name === element.name) {
        if (content instanceof container_box) {
          return content.merge(element)
        }
        // merge element?

        throw new Error(`not sure about merging elements`)
      }
    }

    this.contents.push(element)
    return true
  }

  merge (element) {
    if (this.name !== element.name) {
      throw new Error(`${this.name} cannot merge with ${element.name}`)
    }

    if (!element instanceof box_container) {
      throw new Error(`cannot merge ${typeof element}`)
    }

    for (let key in this.contents) {
      let sub_element = this.contents[key]
      if (!this.add(sub_element)) {
        return false
      }
    }
    return true
  }

  save (in_fh, out_fh, delta) {
    if (this.header_size === 16) {
      out_fh.write(jspack.pack(">I", 1))
      out_fh.write(new Buffer(this.name))
      out_fh.write(jspack.pack(">Q", this.size()))
    } else if (this.header_size === 8) {
      out_fh.write(hexBuffer(">I", this.size()))
      out_fh.write(new Buffer(this.name))
    }

    for (let key in this.contents) {
      let element = this.contents[key]
      element.save(in_fh, out_fh, delta)
    }
  }
}

module.exports = {
  box,
  container_box,
}
