/***** TYPE TAGS *****/

const NULL      = 0b00000000
const UNDEFINED = 0b00000001
const TRUE      = 0b00000010
const FALSE     = 0b00000011

const REFERENCE = 0b00000100
const NUMBER    = 0b00000101

const BIGINTN   = 0b00001000
const BIGINTP   = 0b00001001
const STRING    = 0b00001010

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

type Cursor = { offset : number }

export function decode(buffer : ArrayBuffer, cursor = { offset: 0 }) {
    const view    = new DataView(buffer, cursor.offset)
    
    const typeTag = view.getUint8(0)
    cursor.offset += 1
    
    if (typeTag === NULL)        return null
    if (typeTag === UNDEFINED)   return undefined
    if (typeTag === TRUE)        return true
    if (typeTag === FALSE)       return false
    if (typeTag === NUMBER)      return decodeNumber(buffer, cursor)
    if (typeTag === BIGINTP)     return decodeBigInt(buffer, cursor)
    if (typeTag === BIGINTN)     return -decodeBigInt(buffer, cursor)
    if (typeTag === STRING)      return decodeString(buffer, cursor)
    if (typeTag === ARRAYBUFFER) return decodeArrayBuffer(buffer, cursor)
    if (typeTag === DATAVIEW)    return decodeDataView(buffer, cursor)
    if (typeTag & ARRAYBUFFER)   return decodeTypedArray(buffer, typeTag, cursor)
}

const arr = new ArrayBuffer(64)
const x = 11231231231312321312312n
const y = decode(encode(x)!)
console.log(y === x)
console.log(x)
console.log(y)

export function concatArrayBuffers(...buffers : ArrayBuffer[]){
    
    let cumulativeSize = 0
    for (const buffer of buffers)
        cumulativeSize += buffer.byteLength
    
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

function decodeNumber(buffer : ArrayBuffer, cursor : Cursor) {
    const view = new DataView(buffer, cursor.offset)
    cursor.offset += 8
    return view.getFloat64(0)
}

// benchmarks/bigint-encode.ts
export function encodeBigInt(bigint : bigint) {
    
    const negative = bigint < 0n
    
    let b = negative ? -bigint : bigint
    let uint64Count = 0
    while (b > 0n) {
        uint64Count++
        b >>= 64n
    }
    
    if (uint64Count > 255) throw new Error('BigInt too large to serialize')
    
    const buffer = new ArrayBuffer(2 + 8 * uint64Count)
    const view = new DataView(buffer)
    
    view.setUint8(0, negative ? BIGINTN : BIGINTP)
    view.setUint8(1, uint64Count)
    
    if (negative) bigint *= -1n
    
    let offset = 2
    while (bigint > 0n) {
        const uint64 = bigint & 0xffffffffffffffffn
        view.setBigUint64(offset, uint64)
        offset += 8
        bigint >>= 64n
    }
    
    return buffer
}

function decodeBigInt(buffer : ArrayBuffer, cursor : Cursor) {
    const view = new DataView(buffer)
    const length = view.getUint8(cursor.offset)
    cursor.offset += 1
    
    let bigint = 0n
    let shift = 0n
    for (let i = 0; i < length; i++) {
        bigint |= view.getBigUint64(cursor.offset) << shift
        cursor.offset += 8
        shift += 64n
    }
    
    return bigint
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
    
    if (num < 0) throw new Error("Cannot encode negative numbers as varint")
    
    const byteCount = varIntByteCount(num)
    const arr = new Uint8Array(byteCount)
    
    for (let i = 0; i < byteCount; i++) {
        arr[i] = (num & 0b01111111) | (i === (byteCount - 1) ? 0 : 0b10000000)
        num >>>= 7
    }
    
    return arr
}

function decodeVarint(bytes: Uint8Array): number {
    
    let num = 0
    let shift = 0
    for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i]
        num |= (b & 0b01111111) << shift
        if ((b & 0b10000000) === 0) return num
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

function decodeString(buffer : ArrayBuffer, cursor : Cursor) {
    const byteArray = new Uint8Array(buffer).subarray(cursor.offset)
    const bufferLength = decodeVarint(byteArray)
    const varIntLength = varIntByteCount(bufferLength)
    cursor.offset += varIntLength + bufferLength
    return new TextDecoder().decode(byteArray.subarray(varIntLength, varIntLength + bufferLength))
}

function encodeArrayBuffer(buffer : ArrayBuffer) {
    return concatArrayBuffers(
        Uint8Array.of(ARRAYBUFFER).buffer,
        encodeVarint(buffer.byteLength).buffer,
        buffer
    )
}

function decodeArrayBuffer(buffer : ArrayBuffer, cursor : Cursor) {
    const byteArray = new Uint8Array(buffer).subarray(cursor.offset)
    const bufferLength = decodeVarint(byteArray)
    const varIntLength = varIntByteCount(bufferLength)
    cursor.offset += varIntLength + bufferLength
    return byteArray.slice(varIntLength, varIntLength + bufferLength).buffer
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

function decodeDataView(buffer : ArrayBuffer, cursor : Cursor) {

    const byteArray     = new Uint8Array(buffer).subarray(cursor.offset)
    const bufferLength  = decodeVarint(byteArray)
    const varIntLength  = varIntByteCount(bufferLength)
    cursor.offset += varIntLength
    
    const byteArray2    = byteArray.subarray(varIntLength)
    const byteOffset    = decodeVarint(byteArray2)
    const varIntLength2 = varIntByteCount(byteOffset)
    cursor.offset += varIntLength2
    
    const byteArray3    = byteArray2.subarray(varIntLength2)
    const byteLength    = decodeVarint(byteArray3)
    const varIntLength3 = varIntByteCount(byteLength)
    cursor.offset += varIntLength3
    
    const sourceBuffer  = byteArray3.slice(varIntLength3, bufferLength).buffer
    cursor.offset += bufferLength
    
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
    const constructor = typedArray.constructor
    
    if (constructor === Int8Array)         return INT8ARRAY
    if (constructor === Uint8Array)        return UINT8ARRAY
    if (constructor === Uint8ClampedArray) return UINT8CLAMPEDARRAY
    if (constructor === Int16Array)        return INT16ARRAY
    if (constructor === Uint16Array)       return UINT16ARRAY
    if (constructor === Int32Array)        return INT32ARRAY
    if (constructor === Uint32Array)       return UINT32ARRAY
    if (constructor === Float32Array)      return FLOAT32ARRAY
    if (constructor === Float64Array)      return FLOAT64ARRAY
    if (constructor === BigInt64Array)     return BIGINT64ARRAY
    if (constructor === BigUint64Array)    return BIGUINT64ARRAY
    
    throw new Error("Invalid typed array: " + constructor?.name ?? typedArray?.[Symbol.toStringTag] ?? constructor ?? typedArray)
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

function decodeTypedArray(buffer : ArrayBuffer, typeTag: number, cursor : Cursor) {
    const byteArray        = new Uint8Array(buffer, cursor.offset)
    
    const bufferLength     = decodeVarint(byteArray.subarray(cursor.offset))
    const varIntLength     = varIntByteCount(bufferLength)
    cursor.offset += varIntLength
    
    const byteOffset       = decodeVarint(byteArray.subarray(cursor.offset))
    const varIntLength2    = varIntByteCount(byteOffset)
    cursor.offset += varIntLength2
    
    const typedArrayLength = decodeVarint(byteArray.subarray(cursor.offset))
    const varIntLength3    = varIntByteCount(typedArrayLength)
    cursor.offset += varIntLength3
    
    const sourceBuffer     = buffer.slice(cursor.offset, cursor.offset + bufferLength)
    cursor.offset += bufferLength
    
    const TypedArray       = constructorOf(typeTag)
    return new TypedArray(sourceBuffer, byteOffset, typedArrayLength)
}

