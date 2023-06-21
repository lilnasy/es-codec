/***** TYPE TAGS *****/

const NULL      = 0b00000000
const UNDEFINED = 0b00000001
const TRUE      = 0b00000010
const FALSE     = 0b00000011

const NUMBER    = 0b00000100
const REFERENCE = 0b00000101

const BIGINT    = 0b00001000
const STRING    = 0b00001001

const ARRAY     = 0b00010000
const OBJECT    = 0b00010001
const SET       = 0b00010010
const MAP       = 0b00010011

const ARRAYBUFFER       = 0b00100000
const DATAVIEW          = 0b00100001
const INT8ARRAY         = 0b00100010
const UINT8ARRAY        = 0b00100011
const UINT8CLAMPEDARRAY = 0b00100100
const INT16ARRAY        = 0b00100101
const UINT16ARRAY       = 0b00100110
const INT32ARRAY        = 0b00100111
const UINT32ARRAY       = 0b00101000
const FLOAT32ARRAY      = 0b00101001
const FLOAT64ARRAY      = 0b00101010
const BIGINT64ARRAY     = 0b00101011
const BIGUINT64ARRAY    = 0b00101100

const TypedArray = Object.getPrototypeOf(Uint8Array.prototype) as Uint8ArrayConstructor

export function encode(x : unknown) {
    
    /* unique types */
    if (x === null)      return Uint8Array.of(NULL).buffer
    if (x === undefined) return Uint8Array.of(UNDEFINED).buffer
    if (x === true)      return Uint8Array.of(TRUE).buffer
    if (x === false)     return Uint8Array.of(FALSE).buffer
    
    /* simple types */
    if (x.constructor === Number) return encodeNumber(x)

    /* lengthy types */
    if (x.constructor === BigInt) return encodeBigInt(x)
    if (x.constructor === String) return encodeString(x)
    
    /* low-level types */
    if (x.constructor === ArrayBuffer) return encodeArrayBuffer(x)
    if (x.constructor === DataView)    return encodeDataView(x)
    if (ArrayBuffer.isView(x))         return encodeTypedArray(x as Uint8Array)
}

export function decode(buffer : ArrayBuffer) {
    const view    = new DataView(buffer)
    const typeTag = view.getUint8(0)
    if (typeTag === NULL)        return null
    if (typeTag === UNDEFINED)   return undefined
    if (typeTag === TRUE)        return true
    if (typeTag === FALSE)       return false
    if (typeTag === NUMBER)      return view.getFloat64(1)
    if (typeTag === BIGINT)      return decodeBigInt(view)
    if (typeTag === STRING)      return decodeString(buffer)
    if (typeTag === ARRAYBUFFER) return decodeArrayBuffer(buffer)
    if (typeTag === DATAVIEW)    return decodeDataView(buffer)
    if (typeTag & 0b00100000)    return decodeTypedArray(buffer)
}

const arr = new ArrayBuffer(64)
console.log(decode(encode(new DataView(arr, 3, 4))!))

export function concatArrayBuffers(...buffers : ArrayBuffer[]){
    const cumulativeSize = buffers.reduce((acc, buf) => acc + buf.byteLength, 0)
	const result = new Uint8Array(cumulativeSize)
	
    let offset = 0
    for (const buffer of buffers) {
		result.set(new Uint8Array(buffer), offset)
		offset += buffer.byteLength
	}
    
	return result.buffer
}

function encodeNumber(number : number) {
    const buffer = new ArrayBuffer(9)
    const view = new DataView(buffer)
    view.setUint8(0, NUMBER)
    view.setFloat64(1, number)
    return buffer
}

// benchmarks/bigint-encode.ts
export function encodeBigInt(bigint : bigint) {
    
    let b = bigint
    let uint64Count = 0
    while (b > 0n) {
        uint64Count++
        b >>= 64n
    }

    const buffer = new ArrayBuffer(2 + 8 * uint64Count)
    const view = new DataView(buffer)
    
    view.setUint8(0, BIGINT)
    view.setUint8(1, uint64Count)
    
    let offset = 2
    while (bigint > 0n) {
        const value = bigint & 0xffffffffffffffffn
        view.setBigUint64(offset, value)
        offset += 8
        bigint >>= 64n
    }
    
    return buffer
}

function decodeBigInt(view : DataView) {
    const length = view.getUint8(1)
    
    let result = 0n
    for (let i = 1; i <= length; i++) {
        result <<= 64n
        result += view.getBigUint64(2 + (length - i) * 8)
    }
    
    return result
}

function varIntByteCount(num: number): number {
    
    let byteCount = 1
    while (num >= 0b10000000) {
        num >>>= 7
        byteCount++
    }
    
    return byteCount
}

// benchmarks/varint-encode.ts
export function encodeVarint(num: number): Uint8Array {
    const byteCount = varIntByteCount(num)
    const arr = new Uint8Array(byteCount)
    
    for (let i = 0; i < byteCount; i++) {
        arr[i] = (num & 0x7f) | (i === (byteCount - 1) ? 0 : 0x80)
        num >>>= 7
    }
    
    return arr
}

function decodeVarint(bytes: Uint8Array): number {
    let num = 0
    let shift = 0
    
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i]
        num |= (b & 0x7f) << shift
        if ((b & 0x80) === 0) return num
        shift += 7
    }
    
    throw new Error("Invalid varint encoding")
}

function encodeString(string : string) {
    const encodedBuffer = new TextEncoder().encode(string).buffer
    return concatArrayBuffers(
        Uint8Array.of(STRING).buffer,
        encodeVarint(encodedBuffer.byteLength).buffer,
        encodedBuffer
    )
}

function decodeString(buffer : ArrayBuffer) {
    const byteArray = new Uint8Array(buffer).subarray(1)
    const length = decodeVarint(byteArray)
    const byteCount = varIntByteCount(length)
    return new TextDecoder().decode(byteArray.subarray(byteCount, byteCount + length))
}

function encodeArrayBuffer(buffer : ArrayBuffer) {
    return concatArrayBuffers(
        Uint8Array.of(ARRAYBUFFER).buffer,
        encodeVarint(buffer.byteLength).buffer,
        buffer
    )
}

function decodeArrayBuffer(buffer : ArrayBuffer) {
    const byteArray = new Uint8Array(buffer).subarray(1)
    const length = decodeVarint(byteArray)
    const byteCount = varIntByteCount(length)
    return byteArray.slice(byteCount, byteCount + length).buffer
}

function encodeDataView(dataView : DataView) {
    return concatArrayBuffers(
        Uint8Array.of(DATAVIEW).buffer,
        encodeVarint(dataView.buffer.byteLength).buffer,
        encodeVarint(dataView.byteOffset).buffer,
        encodeVarint(dataView.byteLength).buffer,
        dataView.buffer
    )
}

function decodeDataView(buffer : ArrayBuffer) {
    const byteArray       = new Uint8Array(buffer).subarray(1)
    const bufferLength    = decodeVarint(byteArray)
    const bufferByteCount = varIntByteCount(bufferLength)
    const byteOffset      = decodeVarint(byteArray.subarray(bufferByteCount))
    const offsetByteCount = varIntByteCount(byteOffset)
    const byteLength      = decodeVarint(byteArray.subarray(bufferByteCount + offsetByteCount))
    const lengthByteCount = varIntByteCount(byteLength)
    const bufferStart     = bufferByteCount + offsetByteCount + lengthByteCount
    const sourceBuffer    = byteArray.slice(bufferStart, bufferStart + bufferLength).buffer
    return new DataView(sourceBuffer, byteOffset, byteLength)
}

type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array

function tagOf(typedArray : TypedArray) {
    if (typedArray.constructor === Int8Array)         return INT8ARRAY
    if (typedArray.constructor === Uint8Array)        return UINT8ARRAY
    if (typedArray.constructor === Uint8ClampedArray) return UINT8CLAMPEDARRAY
    if (typedArray.constructor === Int16Array)        return INT16ARRAY
    if (typedArray.constructor === Uint16Array)       return UINT16ARRAY
    if (typedArray.constructor === Int32Array)        return INT32ARRAY
    if (typedArray.constructor === Uint32Array)       return UINT32ARRAY
    if (typedArray.constructor === Float32Array)      return FLOAT32ARRAY
    if (typedArray.constructor === Float64Array)      return FLOAT64ARRAY
    if (typedArray.constructor === BigInt64Array)     return BIGINT64ARRAY
    if (typedArray.constructor === BigUint64Array)    return BIGUINT64ARRAY
    
    throw new Error("Invalid typed array: " + typedArray?.constructor?.name ?? typedArray?.[Symbol.toStringTag])
}

function constructorOf(typeTag : number) {
    if (typeTag === INT8ARRAY)         return Int8Array
    if (typeTag === UINT8ARRAY)        return Uint8Array
    if (typeTag === UINT8CLAMPEDARRAY) return Uint8ClampedArray
    if (typeTag === INT16ARRAY)        return Int16Array
    if (typeTag === UINT16ARRAY)       return Uint16Array
    if (typeTag === INT32ARRAY)        return Int32Array
    if (typeTag === UINT32ARRAY)       return Uint32Array
    if (typeTag === FLOAT32ARRAY)      return Float32Array
    if (typeTag === FLOAT64ARRAY)      return Float64Array
    if (typeTag === BIGINT64ARRAY)     return BigInt64Array
    if (typeTag === BIGUINT64ARRAY)    return BigUint64Array

    throw new Error("Invalid type tag: " + typeTag)
}

function encodeTypedArray(typedArray : TypedArray) {
    return concatArrayBuffers(
        Uint8Array.of(tagOf(typedArray)).buffer,
        encodeVarint(typedArray.buffer.byteLength).buffer,
        encodeVarint(typedArray.byteOffset).buffer,
        encodeVarint(typedArray.length).buffer,
        typedArray.buffer
    )
}

function decodeTypedArray(buffer : ArrayBuffer) {
    const byteArray        = new Uint8Array(buffer)
    const typeTag          = byteArray[0]
    const byteLength       = decodeVarint(byteArray.subarray(1))
    const byteCount        = varIntByteCount(byteLength)
    const byteOffset       = decodeVarint(byteArray.subarray(1 + byteCount))
    const byteOffsetCount  = varIntByteCount(byteOffset)
    const length           = decodeVarint(byteArray.subarray(1 + byteCount + byteOffsetCount))
    const byteLengthOffset = 1 + byteCount + byteOffsetCount + varIntByteCount(length)
    const sourceBuffer     = buffer.slice(byteLengthOffset, byteLengthOffset + byteLength)
    const TypedArray       = constructorOf(typeTag)
    return new TypedArray(sourceBuffer, byteOffset, length)
}

