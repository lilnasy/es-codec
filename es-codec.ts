/***** TYPE TAGS *****/

const NULL      = 0b00000001
const UNDEFINED = 0b00000010
const TRUE      = 0b00000011
const FALSE     = 0b00000100
const REFERENCE = 0b00000101
const NUMBER    = 0b00000110
const DATE      = 0b00000111
const REGEXP    = 0b00001000
const STRING    = 0b00001001
const BIGINTN   = 0b00001010
const BIGINTP   = 0b00001011
const ARRAY     = 0b00001100
const OBJECT    = 0b00001101
const SET       = 0b00001110
const MAP       = 0b00001111
const _RECORD   = 0b00010000 // https://github.com/tc39/proposal-record-tuple
const _TUPLE    = 0b00010001

const ERROR           = 0b00100000
const EVAL_ERROR      = 0b00100001
const RANGE_ERROR     = 0b00100010
const REFERENCE_ERROR = 0b00100011
const SYNTAX_ERROR    = 0b00100100
const TYPE_ERROR      = 0b00100101
const URI_ERROR       = 0b00100110

const ARRAYBUFFER       = 0b01000000
const DATAVIEW          = 0b01000001
const INT8ARRAY         = 0b01000010
const UINT8ARRAY        = 0b01000011
const UINT8CLAMPEDARRAY = 0b01000100
const INT16ARRAY        = 0b01000101
const UINT16ARRAY       = 0b01000110
const INT32ARRAY        = 0b01000111
const UINT32ARRAY       = 0b01001000
const FLOAT32ARRAY      = 0b01001001
const FLOAT64ARRAY      = 0b01001010
const BIGINT64ARRAY     = 0b01001011
const BIGUINT64ARRAY    = 0b01001100

const EXTENSION         = 0b10000000


/***** PUBLIC API *****/

export type Serializable = ExtendedSerializable<never>

export function encode(x : Serializable) {
    return encodeImpl({ referrables: [], extensions: [], context: undefined }, x)
}

export function decode(buffer : ArrayBuffer) {
    return decodeImpl({ offset: 0, referrables: [], extensions: [], context: undefined }, buffer) as Serializable
}

export class NotSerializable extends Error {
    name = "NotSerializableError" as const
    constructor(readonly value : unknown) {
        super()
    }
}

export interface Extension<Extended, ReducedType, Context> {
    name   : string
    when   : (x : unknown) => x is Extended
    encode : (extended : Extended   , context : Context) => ReducedType
    decode : (reduced  : ReducedType, context : Context) => Extended
}

export function defineExtension<Extended, ReducedType, Context>(
    extension: Extension<Extended, ReducedType, Context>
) {
    return extension
}

/**
 * A helper function that allows you to easily create a custom
 * codec that uses context. This is only useful for type-checking.
 * It does not do anything at runtime.
 */
export function defineContext<Context = Nothing>() {
    return {
        // deno-lint-ignore no-explicit-any
        createCodec<Extensions extends Extension<any, any, Context>[]>(extensions : Extensions) {
            return createCodecImpl<Context, Extensions>(extensions)
        }
    }
}

// deno-lint-ignore no-explicit-any
export function createCodec<Extensions extends Extension<any, any, undefined>[]>(extensions : Extensions) {
    return createCodecImpl<Nothing, Extensions>(extensions)
}


/***** TYPES *****/

type BaseSerializablePrimitives =
    | null
    | undefined
    | boolean
    | number
    | bigint
    | string

type BaseSerializableObjects =
    | Date
    | RegExp

type BaseSerializableErrors =
    | Error // Error being serializable does not mean its subclasses are too, but there's no way to communicate that using typescript
    | EvalError
    | RangeError
    | SyntaxError
    | ReferenceError
    | TypeError
    | URIError

type BaseSerializableMemory =
    | ArrayBuffer
    | DataView
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | BigInt64Array
    | BigUint64Array

type BaseSerializable =
    | BaseSerializablePrimitives
    | BaseSerializableObjects
    | BaseSerializableErrors
    | BaseSerializableMemory

type ExtendedSerializable<AdditionalTypes> =
    | BaseSerializable
    | AdditionalTypes
    | (BaseSerializable | AdditionalTypes)[]
    | Set<BaseSerializable | AdditionalTypes>
    | Map<BaseSerializable | AdditionalTypes, BaseSerializable | AdditionalTypes>
    | { [_ in (string | number | symbol extends AdditionalTypes ? symbol : never)]: BaseSerializable | AdditionalTypes }

interface Encoder<Context> {
    referrables : Memory
    extensions  : InternalExtension[]
    context     : Context
}

interface Decoder<Context> {
    offset      : number
    referrables : Memory
    extensions  : InternalExtension[]
    context     : Context
}

type Memory = unknown[]

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

class Unreachable extends Error { name = "UnreachableError" as const }

interface InternalExtension {
    name       : string
    when       : (x : unknown) => boolean
    encodeImpl : typeof encodeImpl
    decodeImpl : typeof decodeImpl
}


/***** IMPLEMENTATION - EXTENSIONS *****/

/**
 * This is a unique "type" for internal use by es-codec.
 * It is used as a default for when the user does not explicitly
 * provide context for use by extensions. It will be interpreted
 * as an instruction to hide the context argument from the types
 * of the encode and decode functions.
 */
type Nothing = typeof nothing
declare const nothing : unique symbol

function createCodecImpl<
    Context,
    // deno-lint-ignore no-explicit-any
    Extensions extends Extension<any, any, never>[]
>(
    extensions : Extensions
) {
    const extensionsInternal = new Array<InternalExtension>

    for (const ext of extensions) {
        extensionsInternal.push({
            name: ext.name,
            when: ext.when,
            encodeImpl(self, x) {
                return concatArrayBuffers(
                    Uint8Array.of(EXTENSION).buffer,
                    encodeImpl(self, ext.name),
                    encodeImpl(self, ext.encode(x, self.context as never))
                )
            },
            decodeImpl(self, buffer) {
                const result = ext.decode(decodeImpl(self, buffer), self.context as never)
                self.referrables.push(result)
                return result
            }
        })
    }
    
    function encode(x : ExtendedSerializable<ExtractExtended<Extensions>>, context : Context) {
        return encodeImpl({ referrables: [], extensions: extensionsInternal, context }, x)
    }
    
    function decode(buffer : ArrayBuffer, context : Context) {
        return decodeImpl({ offset: 0, referrables: [], extensions: extensionsInternal, context }, buffer) as ExtendedSerializable<ExtractExtended<Extensions>>
    }
    
    return {
        encode: encode as If<Equals<Context, Nothing>, OneArity<typeof encode>, typeof encode>,
        decode: decode as If<Equals<Context, Nothing>, OneArity<typeof decode>, typeof decode>
    }
}


/***** IMPLEMENTATION - CORE *****/

function encodeImpl(self : Encoder<unknown>, x : unknown) : ArrayBuffer {
    
    /* unique types */
    if (x === null)      return Uint8Array.of(NULL).buffer
    if (x === undefined) return Uint8Array.of(UNDEFINED).buffer
    if (x === true)      return Uint8Array.of(TRUE).buffer
    if (x === false)     return Uint8Array.of(FALSE).buffer
    
    /* simple types */
    if (x.constructor === Number) return encodeNumber(x)
    if (x.constructor === Date)   return encodeDate(x)
    if (x.constructor === RegExp) return encodeRegex(x)
    
    /* lengthy types */
    if (x.constructor === BigInt) return encodeBigInt(x)
    if (x.constructor === String) return encodeString(x)
    
    /* container types */
    if (x.constructor === Array)  return maybeEncodeReference(self, x, encodeArray)
    if (x.constructor === Object) return maybeEncodeReference(self, x as Record<string, unknown>, encodeObject)
    if (x.constructor === Set)    return maybeEncodeReference(self, x, encodeSet)
    if (x.constructor === Map)    return maybeEncodeReference(self, x, encodeMap)
    
    /* error types */
    if (x instanceof Error) return maybeEncodeReference(self, x, encodeError)
    
    /* low-level types */
    if (x.constructor === ArrayBuffer) return maybeEncodeReference(self, x, encodeArrayBuffer)
    if (ArrayBuffer.isView(x))         return maybeEncodeReference(self, x as TypedArray, encodeTypedArray)
    
    /* extension types */
    for (const extension of self.extensions)
        if (extension.when(x) === true)
            return maybeEncodeReference(self, x, extension.encodeImpl)
    
    throw new NotSerializable(x)
}

function decodeImpl(self : Decoder<unknown>, buffer : ArrayBuffer) : unknown {
    
    const view    = new DataView(buffer, self.offset)
    
    const typeTag = view.getUint8(0)
    self.offset += 1
    
    if (typeTag === NULL)        return null
    if (typeTag === UNDEFINED)   return undefined
    if (typeTag === TRUE)        return true
    if (typeTag === FALSE)       return false
    if (typeTag === REFERENCE)   return decodeReference(self, buffer)
    if (typeTag === NUMBER)      return decodeNumber(self, buffer)
    if (typeTag === DATE)        return decodeDate(self, buffer)
    if (typeTag === REGEXP)      return decodeRegex(self, buffer)
    if (typeTag === BIGINTP)     return decodeBigInt(self, buffer)
    if (typeTag === BIGINTN)     return -decodeBigInt(self, buffer)
    if (typeTag === STRING)      return decodeString(self, buffer)
    if (typeTag === ARRAY)       return decodeArray(self, buffer)
    if (typeTag === OBJECT)      return decodeObject(self, buffer)
    if (typeTag === SET)         return decodeSet(self, buffer)
    if (typeTag === MAP)         return decodeMap(self, buffer)
    if (typeTag & ERROR)         return decodeError(self, buffer, typeTag)
    if (typeTag === ARRAYBUFFER) return decodeArrayBuffer(self, buffer)
    if (typeTag & ARRAYBUFFER)   return decodeTypedArray(self, buffer, typeTag)
    if (typeTag & EXTENSION) {
        const name = decodeImpl(self, buffer) as string
        
        for (const ext of self.extensions)
            if (ext.name === name)
                return ext.decodeImpl(self, buffer)
    }

    throw new Unreachable
}

function maybeEncodeReference<T>(
    self    : Encoder<unknown>,
    x       : T,
    encoder : (self : Encoder<unknown>, x : T) => ArrayBuffer
) {
    const alreadyEncoded = self.referrables.indexOf(x)
    
    if (alreadyEncoded === -1) {
        self.referrables.push(x)
        return encoder(self, x)
    }
    
    return encodeReference(alreadyEncoded)
}

function encodeReference(reference : number) {
    return concatArrayBuffers(Uint8Array.of(REFERENCE), encodeVarint(reference).buffer)
}

function decodeReference(self: Decoder<unknown>, buffer : ArrayBuffer) {
    const reference = decodeVarint(self, buffer)
    return self.referrables[reference]
}

function encodeNumber(number : number) {
    const buffer = new ArrayBuffer(9)
    const view = new DataView(buffer)
    view.setUint8(0, NUMBER)
    view.setFloat64(1, number)
    return buffer
}

function decodeNumber(self: Decoder<unknown>, buffer : ArrayBuffer) {
    const view = new DataView(buffer, self.offset)
    self.offset += 8
    return view.getFloat64(0)
}

function encodeDate(date : Date) {
    const buffer = new ArrayBuffer(9)
    const view = new DataView(buffer)
    view.setUint8(0, DATE)
    view.setFloat64(1, date.getTime())
    return buffer
}

function decodeDate(self: Decoder<unknown>, buffer : ArrayBuffer) {
    const view = new DataView(buffer, self.offset)
    self.offset += 8
    return new Date(view.getFloat64(0))
}

function encodeRegex(regex : RegExp) {
    return concatArrayBuffers(Uint8Array.of(REGEXP).buffer, encodeString(regex.source), encodeString(regex.flags))
}

function decodeRegex(self: Decoder<unknown>, buffer : ArrayBuffer) {
    self.offset += 1 // skip reading the string type tag
    const source = decodeString(self, buffer)
    self.offset += 1 // skip reading the string type tag
    const flags = decodeString(self, buffer)
    return new RegExp(source, flags)
}

// benchmarks/bigint-encode.ts
function encodeBigInt(bigint : bigint) {
    
    const negative = bigint < 0n
    
    let b = negative ? -bigint : bigint
    let uint64Count = 0
    while (b > 0n) {
        uint64Count++
        b >>= 64n
    }
    
    if (uint64Count > 255) throw new NotSerializable(bigint)
    
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

function decodeBigInt(self : Decoder<unknown>, buffer : ArrayBuffer) {
    
    const view = new DataView(buffer)
    const length = view.getUint8(self.offset)
    self.offset += 1
    
    let bigint = 0n
    let shift = 0n
    for (let i = 0; i < length; i++) {
        bigint |= view.getBigUint64(self.offset) << shift
        self.offset += 8
        shift += 64n
    }
    
    return bigint
}

function encodeString(string : string) {
    
    const encodedBuffer = new TextEncoder().encode(string).buffer
    
    return concatArrayBuffers(
        Uint8Array.of(STRING).buffer,
        encodeVarint(encodedBuffer.byteLength).buffer,
        encodedBuffer
    )
}

function decodeString(self: Decoder<unknown>, buffer : ArrayBuffer) {
    const textBufferLength = decodeVarint(self, buffer)
    const decodedString = new TextDecoder().decode(new Uint8Array(buffer, self.offset, textBufferLength))
    self.offset += textBufferLength
    return decodedString
}

function encodeArray(self : Encoder<unknown>, array : unknown[]) {
    
    if (array.length !== Object.keys(array).length) throw new NotSerializable(array)
    
    return concatArrayBuffers(
        Uint8Array.of(ARRAY).buffer,
        encodeVarint(array.length).buffer,
        ...array.map(x => encodeImpl(self, x)!)
    )
}

function decodeArray(self: Decoder<unknown>, buffer : ArrayBuffer) {
    
    const result : unknown[] = []
    self.referrables.push(result)
    
    const arrayLength = decodeVarint(self, buffer)
    
    for (let i = 0; i < arrayLength; i++)
        result.push(decodeImpl(self, buffer))
    
    return result
}

function encodeObject(self : Encoder<unknown>, object : Record<string, unknown>) {
    
    const keys = Object.keys(object)
    
    return concatArrayBuffers(
        Uint8Array.of(OBJECT).buffer,
        encodeVarint(keys.length).buffer,
        ...keys.map(key =>
            concatArrayBuffers(
                encodeString(key),
                encodeImpl(self, object[key])!
            )
        )
    )
}

function decodeObject(self: Decoder<unknown>, buffer : ArrayBuffer) {
    
    const objectLength = decodeVarint(self, buffer)
    const result : Record<string, unknown> = {}
    self.referrables.push(result)

    for (let i = 0; i < objectLength; i++) {
        // ignore the tag for the key, go directly to decoding it as a string
        self.offset += 1
        const key = decodeString(self, buffer)
        result[key] = decodeImpl(self, buffer)
    }

    return result
}

function encodeSet(self : Encoder<unknown>, set : Set<unknown>) {
    return concatArrayBuffers(
        Uint8Array.of(SET).buffer,
        encodeVarint(set.size).buffer,
        ...[...set].map(value => encodeImpl(self, value)!)
    )
}

function decodeSet(self: Decoder<unknown>, buffer : ArrayBuffer) {
    
    const setLength = decodeVarint(self, buffer)
    const result = new Set
    self.referrables.push(result)

    for (let i = 0; i < setLength; i++) {
        const element = decodeImpl(self, buffer)
        result.add(element)
    }
    
    return result
}

function encodeMap(self : Encoder<unknown>, map : Map<unknown, unknown>) {
    return concatArrayBuffers(
        Uint8Array.of(MAP).buffer,
        encodeVarint(map.size).buffer,
        ...[...map].map(([key, value]) =>
            concatArrayBuffers(
                encodeImpl(self, key)!,
                encodeImpl(self, value)!
            )
        )
    )
}

function decodeMap(self: Decoder<unknown>, buffer : ArrayBuffer) {
    
    const mapLength = decodeVarint(self, buffer)
    const result = new Map
    self.referrables.push(result)

    for (let i = 0; i < mapLength; i++) {
        const key = decodeImpl(self, buffer)
        const value = decodeImpl(self, buffer)
        result.set(key, value)
    }

    return result
}

function tagOfError(error : Error) {
    
    const constructor = error.constructor

    if (constructor === Error)          return ERROR
    if (constructor === EvalError)      return EVAL_ERROR
    if (constructor === RangeError)     return RANGE_ERROR
    if (constructor === ReferenceError) return REFERENCE_ERROR
    if (constructor === SyntaxError)    return SYNTAX_ERROR
    if (constructor === TypeError)      return TYPE_ERROR
    if (constructor === URIError)       return URI_ERROR
    
    throw new NotSerializable(error)
}

function constructorOfError(tag : number) {
    
    if (tag === ERROR)           return Error
    if (tag === EVAL_ERROR)      return EvalError
    if (tag === RANGE_ERROR)     return RangeError
    if (tag === REFERENCE_ERROR) return ReferenceError
    if (tag === SYNTAX_ERROR)    return SyntaxError
    if (tag === TYPE_ERROR)      return TypeError
    if (tag === URI_ERROR)       return URIError

    throw new Unreachable
}

function encodeError(self : Encoder<unknown>, error : Error) {
    return concatArrayBuffers(
        Uint8Array.of(tagOfError(error)).buffer,
        encodeString(error.message),
        encodeString(error.stack ?? ''),
        encodeImpl(self, (error as unknown as { cause: unknown } ).cause)!
    )
}

function decodeError(self: Decoder<unknown>, buffer : ArrayBuffer, typeTag : number) {
    // ignore the tag for the message, go directly to decoding it as a string
    self.offset += 1
    const message = decodeString(self, buffer)
    
    // ignore the tag for the stack, go directly to decoding it as a string
    self.offset += 1
    const stack = decodeString(self, buffer)
    const cause = decodeImpl(self, buffer)
    
    const error : Error =
        cause === undefined
            ? new (constructorOfError(typeTag))(message)
            // @ts-ignore error cause has been supported by every major runtime since 2021
            : new (constructorOfError(typeTag))(message, { cause })
    
    self.referrables.push(error)
    error.stack = stack
    
    return error
}

function encodeArrayBuffer(_ : Encoder<unknown>, buffer : ArrayBuffer) {
    return concatArrayBuffers(
        Uint8Array.of(ARRAYBUFFER).buffer,
        encodeVarint(buffer.byteLength).buffer,
        buffer
    )
}

function decodeArrayBuffer(self: Decoder<unknown>, buffer : ArrayBuffer) {
    const bufferLength = decodeVarint(self, buffer)
    const decodedBuffer = buffer.slice(self.offset, self.offset + bufferLength)
    self.offset += bufferLength
    self.referrables.push(decodedBuffer)
    return decodedBuffer
}

function tagOfTypedArray(typedArray : TypedArray) {
    
    const constructor = typedArray.constructor
    
    if (constructor === DataView)          return DATAVIEW
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
    
    throw new NotSerializable(typedArray)
}

function constructorOfTypedArray(typeTag : number) {
    
    if (typeTag === DATAVIEW)          return DataView
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
    
    throw new Unreachable
}

function encodeTypedArray(_ : Encoder<unknown>, typedArray : TypedArray) {
    return concatArrayBuffers(
        Uint8Array.of(tagOfTypedArray(typedArray)).buffer,
        encodeVarint(typedArray.buffer.byteLength).buffer,
        encodeVarint(typedArray.byteOffset).buffer,
        encodeVarint(typedArray instanceof DataView ? typedArray.byteLength : typedArray.length).buffer,
        typedArray.buffer
    )
}

function decodeTypedArray(self: Decoder<unknown>, buffer : ArrayBuffer, typeTag: number) {
    const bufferLength = decodeVarint(self, buffer)
    const byteOffset   = decodeVarint(self, buffer)
    const viewLength   = decodeVarint(self, buffer)
    const sourceBuffer = buffer.slice(self.offset, self.offset + bufferLength)
    self.offset     += bufferLength
    const TypedArray   = constructorOfTypedArray(typeTag)
    const decodedView  = new TypedArray(sourceBuffer, byteOffset, viewLength)
    self.referrables.push(decodedView)
    return decodedView
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
function encodeVarint(num: number): Uint8Array {
    
    const byteCount = varIntByteCount(num)
    const arr = new Uint8Array(byteCount)
    
    for (let i = 0; i < byteCount; i++) {
        arr[i] = (num & 0b01111111) | (i === (byteCount - 1) ? 0 : 0b10000000)
        num >>>= 7
    }
    
    return arr
}

function decodeVarint(self: Decoder<unknown>, buffer : ArrayBuffer) {
    
    const byteArray = new Uint8Array(buffer, self.offset)

    let num = 0
    let shift = 0
    for (let i = 0; i < byteArray.length; i++) {
        const varIntPart = byteArray[i]
        self.offset += 1
        num |= (varIntPart & 0b01111111) << shift
        if ((varIntPart & 0b10000000) === 0) return num
        shift += 7
    }
    
    throw new Unreachable
}


/***** UTILITY FUNCTIONS *****/

function concatArrayBuffers(...buffers : ArrayBuffer[]){
    
    let cumulativeSize = 0
    for (const buffer of buffers)
        cumulativeSize += buffer.byteLength
    
	const result = new Uint8Array(cumulativeSize)
	
    let offset = 0
    for (const buffer of buffers) {
		result.set(new Uint8Array(buffer), offset)
		offset += buffer.byteLength
	}
    
	return result.buffer as ArrayBuffer
}

type If<Condition, Then, Else> = Condition extends true ? Then : Else

type OneArity<Fun> =
    // deno-lint-ignore no-explicit-any
    Fun extends (...args : [ infer I, ...any[] ] ) => infer O
        ? (input : I) => O
        : 5

type Equals<Left, Right> = Left extends Right ? Right extends Left ? true : false : false

type ExtractExtended<Extensions extends unknown[]> =
    // deno-lint-ignore no-explicit-any
    Extensions[number] extends { encode(x : infer Extended, context : any) : any }
        ? Extended
        : never

