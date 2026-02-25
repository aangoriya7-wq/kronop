// GC-free memory management
class MemoryPool {
  constructor(size = 1000) {
    this.pool = [];
    this.size = size;
    this.init();
  }

  init() {
    for (let i = 0; i < this.size; i++) {
      this.pool.push({
        id: i,
        data: new ArrayBuffer(1024 * 1024), // 1MB chunks
        used: false,
      });
    }
  }

  acquire() {
    const chunk = this.pool.find(c => !c.used);
    if (chunk) {
      chunk.used = true;
      return chunk;
    }
    // Expand pool if needed
    const newChunk = {
      id: this.pool.length,
      data: new ArrayBuffer(1024 * 1024),
      used: true,
    };
    this.pool.push(newChunk);
    return newChunk;
  }

  release(chunk) {
    chunk.used = false;
  }

  reset() {
    this.pool.forEach(c => c.used = false);
  }
}

// Binary serializer (replaces JSON)
class BinarySerializer {
  static serialize(obj) {
    const buffer = new ArrayBuffer(1024);
    const view = new DataView(buffer);
    let offset = 0;

    Object.entries(obj).forEach(([key, value]) => {
      // Write key length
      view.setUint8(offset, key.length);
      offset += 1;
      
      // Write key
      for (let i = 0; i < key.length; i++) {
        view.setUint8(offset + i, key.charCodeAt(i));
      }
      offset += key.length;
      
      // Write value type and data
      if (typeof value === 'string') {
        view.setUint8(offset, 1); // type: string
        offset += 1;
        view.setUint16(offset, value.length);
        offset += 2;
        for (let i = 0; i < value.length; i++) {
          view.setUint8(offset + i, value.charCodeAt(i));
        }
        offset += value.length;
      } else if (typeof value === 'number') {
        view.setUint8(offset, 2); // type: number
        offset += 1;
        view.setFloat64(offset, value);
        offset += 8;
      }
    });

    return buffer.slice(0, offset);
  }

  static deserialize(buffer) {
    const view = new DataView(buffer);
    let offset = 0;
    const obj = {};

    while (offset < buffer.byteLength) {
      // Read key length
      const keyLen = view.getUint8(offset);
      offset += 1;
      
      // Read key
      let key = '';
      for (let i = 0; i < keyLen; i++) {
        key += String.fromCharCode(view.getUint8(offset + i));
      }
      offset += keyLen;
      
      // Read value type
      const type = view.getUint8(offset);
      offset += 1;
      
      if (type === 1) { // string
        const strLen = view.getUint16(offset);
        offset += 2;
        let value = '';
        for (let i = 0; i < strLen; i++) {
          value += String.fromCharCode(view.getUint8(offset + i));
        }
        offset += strLen;
        obj[key] = value;
      } else if (type === 2) { // number
        obj[key] = view.getFloat64(offset);
        offset += 8;
      }
    }

    return obj;
  }
}

export { MemoryPool, BinarySerializer };
