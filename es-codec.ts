/***** PUBLIC API *****/

/**
 * A union of all the types that es-codec can encode out of the box.
 */
export type Serializable = ExtendedSerializable<never>

/**
 * Serializes a value into an ArrayBuffer.
 * 
 * Basic Usage:
 * ```ts
 * const arrayBuffer = encode([ 4n, new Set, { x: Infinity } ])
 * console.log(arrayBuffer instanceof ArrayBuffer) // true
 * ```
 * Throws `NotSerializableError` if the value or one of its contained values is not supported.
 * 
 * Throws `BigIntTooLargeError` if a bigint is larger than 2kB.
 * 
 * Throws `MalformedArrayError` if an array
 * - has properties (`[].x = "whatever"`), or
 * - contains empty items (`Array(1)`).
 */
export function encode(x : Serializable) {
    return encodeImpl({ referrables: [], extensions: [], context: undefined }, x)
}

/**
 * Deserializes an ArrayBuffer created using `encode` into the original value.
 * 
 * Basic Usage:
 * ```ts
 * const arrayBuffer = encode([ 4n, new Set, { x: Infinity } ])
 * const originalValue = decode(arrayBuffer)
 * console.log(originalValue instanceof Array) // true
 * console.log(originalValue[0] instanceof BigInt) // true
 * console.log(originalValue[1].size === 0) // true
 * console.log(originalValue[2].x === Infinity) // true
 * ```
 * Throws `IncompatibleCodecError` if the value was encoded using an extension.
 */
export function decode(buffer : ArrayBuffer) {
    return decodeImpl({ offset: 0, referrables: [], extensions: [], context: undefined }, buffer) as Serializable
}

/**
 * Thrown by `encode` if a value or one if its contained value is not supported and support was not added via an extension.
 */
export class NotSerializableError extends Error {
    name = "NotSerializableError" as const
    constructor(readonly value : unknown) {
        super()
    }
}

/**
 * Thrown by `encode` if a bigint is larger than 2kB.
 */
export class BigIntTooLargeError extends Error {
    name = "BigIntTooLargeError" as const
    constructor(readonly bigint : bigint) {
        super()
    }
}

/**
 * Thrown by `encode` if custom properties have been set on an array or it contains empty items.
 * 
 * Here are the two instances where this might happen:
 * ```ts
 * const arrayWithProperties = []
 * arrayWithProperties.x = "whatever"
 * encode(arrayWithProperties) // throws `MalformedArrayError`
 * 
 * const arrayWithEmptyItems = Array(2)
 * arrayWithEmptyItems[0] = "value"
 * // only one of the two spaces in the array is occupied
 * encode(arrayWithEmptyItems) // throws `MalformedArrayError`
 * ```
 */
export class MalformedArrayError extends Error {
    name = "MalformedArrayError" as const
    constructor(readonly array : Array<unknown>) {
        super()
    }
}

/**
 * Thrown by `decode` if one of the values was encoded using an extension not available to the current codec.
 */
export class IncompatibleCodec extends Error {
    name = "IncompatibleCodecError" as const
    constructor(readonly extensionName : string) {
        super()
    }
}

export interface Extension<Extended, ReducedType, Context> {
    /**
     * This will be used as the tag in the serialized representation. When deserializing, the tag is used to identify the extension that should be used for decoding.
     */
    name : string
    
    /**
     * This is a function that receives an unsupported object as the argument. It should return true if the extension can encode the provided object.
     */
    when(x : unknown) : x is Extended
    
    /**
     * This is a function that receives all unsupported objects for which `when` returned true. You can "reduce" your custom type in terms of other types that are supported. For example, you can encode a `Graph` as `{ edges: Array<Edge>, nodes: Array<Node> }`. Another extension can encode an `Edge` as `[ from : number, to: number ]`.
     */
    encode(extended : Extended, context : Context) : ReducedType
    
    /**
     * This is a function that receives the "reduced" representation created by the extension's `encode` and reconstructs your custom type from it.
     */
    decode(reduced : ReducedType, context : Context) : Extended
}

/**
 * A helper function that allows you to easily create an extension and let TypeScript infer the types.
 * 
 * This is only useful for type-checking; it returns the provided object as-is.
 * 
 * Here's how you would add suport for URLs
 * ```ts
 * const urlExtension = defineExtension({
 * name: "URL",
 *     // `x is URL` is a type predicate, necessary for type inference
 *     when  : (x): x is URL => x instanceof URL,
 *     encode: url => url.href,
 *     decode: href => new URL(href)
 * })
 * ```
 */
export function defineExtension<Extended, ReducedType, Context>(
    extension: Extension<Extended, ReducedType, Context>
) {
    return extension
}

/**
 * A helper function that allows you to easily create a custom codec that uses context.
 * 
 * This is only useful for type-checking; it does not do anything at runtime.
 * 
 * Here's how you would use it to type a context that can log values:
 * ```ts
 * interface Logger {
 *     log(...args : any[]): void
 * }
 * 
 * const { encode, decode } = defineContext<Logger>().createCodec([
 *     defineExtension({
 *         name: "URL",
 *         when: (x): x is URL => x instanceof URL,
 *         encode(url, context) {
 *             context.log("encoding url", url)
 *             return url.href
 *         },
 *         decode(href, context) {
 *             context.log("decoding url", href)
 *             return new URL(href)
 *         }
 *     })
 * ])
 * 
 * const encodedUrl = encode(new URL("https://example.com"), console)
 * const decodedUrl = decode(encodedURL, console)
 * ```
 */
export function defineContext<Context = NoContext>() {
    return {
        /**
         * Create a custom codec that adds support for more types than what es-codec offers out of the box.
         * 
         * Here's how you would add support for URLs: 
         * ```ts
         * const { encode, decode } = defineContext<ContextType>().createCodec([
         *     {
         *         name  : "URL",
         *         when  : (x): x is URL => x instanceof URL,
         *         encode: (url, context) => url.href,
         *         decode: (href, context) => new URL(href)
         *     }
         * ])
         * const arrayBuffer = encode({ url: new URL(window.location) }, contextImplementation)
         * ```
         */
        // deno-lint-ignore no-explicit-any
        createCodec<Extensions extends Extension<any, any, Context>[]>(extensions : Extensions) {
            return createCodecImpl<Context, Extensions>(extensions)
        }
    }
}

/**
 * Create a custom codec that adds support for more types than what es-codec offers out of the box.
 * 
 * Here's how you would add support for URLs:
 * ```ts
 * const { encode, decode } = createCodec([
 *     {
 *         name  : "URL",
 *         when  : (x): x is URL => x instanceof URL,
 *         encode: url => url.href,
 *         decode: href => new URL(href)
 *     }
 * ])
 * const arrayBuffer = encode({ url: new URL(window.location) })
 * ```
 */
// deno-lint-ignore no-explicit-any
export function createCodec<Extensions extends Extension<any, any, undefined>[]>(extensions : Extensions) {
    return createCodecImpl<NoContext, Extensions>(extensions)
}


/***** TYPE TAGS *****/

const NULL        = 0b00000001 // 1
const UNDEFINED   = 0b00000010 // 2
const TRUE        = 0b00000011 // 3
const FALSE       = 0b00000100 // 4

const REFERENCE   = 0b00000111 // 7
const SMALLINTP   = 0b00001000 // 8
const FLOAT64     = 0b00001001 // 9
const DATE        = 0b00001010 // 10
const _DECIMAL128 = 0b00001001 // 11 https://github.com/tc39/proposal-decimal

const _BIGDECIMAL = 0b00001110 // 14
const BIGINTN     = 0b00001111 // 15
const BIGINTP     = 0b00010000 // 16
const STRING      = 0b00010001 // 17
const REGEXP      = 0b00010010 // 18

const _RECORD     = 0b00010101 // 21 https://github.com/tc39/proposal-record-tuple
const _TUPLE      = 0b00010110 // 22

const ARRAY       = 0b00011001 // 25
const OBJECT      = 0b00011010 // 26
const SET         = 0b00011011 // 27
const MAP         = 0b00011100 // 28

const ERROR           = 0b00100000 // 32
const EVAL_ERROR      = 0b00100001
const RANGE_ERROR     = 0b00100010
const REFERENCE_ERROR = 0b00100011
const SYNTAX_ERROR    = 0b00100100
const TYPE_ERROR      = 0b00100101
const URI_ERROR       = 0b00100110

const ARRAYBUFFER       = 0b01000000 // 64
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

const EXTENSION         = 0b10000000 // 128


/***** TYPES AND INTERFACES *****/

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

interface Encoder<Context = unknown> {
    referrables : Memory
    extensions  : InternalExtension[]
    context     : Context
}

interface Decoder<Context = unknown> {
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

class Unreachable extends Error {
    name = "UnreachableError" as const
}

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
type NoContext = typeof NoContext
declare const NoContext : unique symbol

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
        /**
         * Serializes a value into an ArrayBuffer.
         * 
         * Basic Usage:
         * ```ts
         * const arrayBuffer = encode([ 4n, new Set, { x: Infinity } ])
         * console.log(arrayBuffer instanceof ArrayBuffer) // true
         * ```
         * Throws `NotSerializableError` if the value or one of its contained values is not supported.
         * 
         * Throws `BigIntTooLargeError` if a bigint is larger than 2kB.
         * 
         * Throws `MalformedArrayError` if an array
         * - has properties (`[].x = "whatever"`), or
         * - contains empty items (`Array(1)`).
         */
        encode: encode as If<Equals<Context, NoContext>, OneArity<typeof encode>, typeof encode>,
        /**
         * Deserializes an ArrayBuffer created using `encode` into the original value.
         * 
         * Basic Usage:
         * ```ts
         * const arrayBuffer = encode([ 4n, new Set, { x: Infinity } ])
         * const originalValue = decode(arrayBuffer)
         * console.log(originalValue instanceof Array) // true
         * console.log(originalValue[0] instanceof BigInt) // true
         * console.log(originalValue[1].size === 0) // true
         * console.log(originalValue[2].x === Infinity) // true
         * ```
         * Throws `IncompatibleCodecError` if the value was encoded using an extension.
         */
        decode: decode as If<Equals<Context, NoContext>, OneArity<typeof decode>, typeof decode>
    }
}


/***** IMPLEMENTATION - CORE *****/

function encodeImpl(self : Encoder, x : unknown) : ArrayBuffer {
    
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
    
    throw new NotSerializableError(x)
}

function decodeImpl(self : Decoder, buffer : ArrayBuffer) : unknown {
    
    const view    = new DataView(buffer, self.offset)
    
    const typeTag = view.getUint8(0)
    self.offset += 1
    
    if (typeTag === NULL)        return null
    if (typeTag === UNDEFINED)   return undefined
    if (typeTag === TRUE)        return true
    if (typeTag === FALSE)       return false
    if (typeTag === REFERENCE)   return decodeReference(self, buffer)
    if (typeTag === SMALLINTP)   return decodeVarint(self, buffer)
    if (typeTag === FLOAT64)     return decodeFloat(self, buffer)
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
        
        throw new IncompatibleCodec(name)
    }

    throw new Unreachable
}

function maybeEncodeReference<T>(
    self    : Encoder,
    x       : T,
    encoder : (self : Encoder, x : T) => ArrayBuffer
) {
    const alreadyEncoded = self.referrables.indexOf(x)
    
    if (alreadyEncoded === -1) {
        self.referrables.push(x)
        return encoder(self, x)
    }
    
    return encodeReference(alreadyEncoded)
}

function encodeReference(reference : number) {
    return concatArrayBuffers(Uint8Array.of(REFERENCE), encodeVarint(reference))
}

function decodeReference(self : Decoder, buffer : ArrayBuffer) {
    const reference = decodeVarint(self, buffer)
    return self.referrables[reference]
}

const MAX_INT_32 = 2 ** 31 - 1

function encodeNumber(number : number) {
    
    if (Number.isInteger(number) && 0 <= number && number <= MAX_INT_32)
        return concatArrayBuffers(Uint8Array.of(SMALLINTP).buffer, encodeVarint(number))
    
    const buffer = new ArrayBuffer(9)
    const view = new DataView(buffer)
    view.setUint8(0, FLOAT64)
    view.setFloat64(1, number)
    return buffer
}

function decodeFloat(self : Decoder, buffer : ArrayBuffer) {
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

function decodeDate(self : Decoder, buffer : ArrayBuffer) {
    const view = new DataView(buffer, self.offset)
    self.offset += 8
    return new Date(view.getFloat64(0))
}

function encodeRegex(regex : RegExp) {
    return concatArrayBuffers(Uint8Array.of(REGEXP).buffer, encodeString(regex.source), encodeString(regex.flags))
}

function decodeRegex(self : Decoder, buffer : ArrayBuffer) {
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
    
    if (uint64Count > 255) throw new BigIntTooLargeError(bigint)
    
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

function decodeBigInt(self : Decoder, buffer : ArrayBuffer) {
    
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
        encodeVarint(encodedBuffer.byteLength),
        encodedBuffer
    )
}

function decodeString(self : Decoder, buffer : ArrayBuffer) {
    const textBufferLength = decodeVarint(self, buffer)
    const decodedString = new TextDecoder().decode(new Uint8Array(buffer, self.offset, textBufferLength))
    self.offset += textBufferLength
    return decodedString
}

function encodeArray(self : Encoder, array : unknown[]) {
    
    // corner case: Object.assign(Array(1), { x: "whatever" })
    if (array.length !== Object.keys(array).length) throw new MalformedArrayError(array)
    
    return concatArrayBuffers(
        Uint8Array.of(ARRAY).buffer,
        encodeVarint(array.length),
        ...array.map(x => encodeImpl(self, x)!)
    )
}

function decodeArray(self : Decoder, buffer : ArrayBuffer) {
    
    const result : unknown[] = []
    self.referrables.push(result)
    
    const arrayLength = decodeVarint(self, buffer)
    
    for (let i = 0; i < arrayLength; i++)
        result.push(decodeImpl(self, buffer))
    
    return result
}

function encodeObject(self : Encoder, object : Record<string, unknown>) {
    
    const keys = Object.keys(object)
    
    return concatArrayBuffers(
        Uint8Array.of(OBJECT).buffer,
        encodeVarint(keys.length),
        ...keys.map(key =>
            concatArrayBuffers(
                encodeString(key),
                encodeImpl(self, object[key])!
            )
        )
    )
}

function decodeObject(self : Decoder, buffer : ArrayBuffer) {
    
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

function encodeSet(self : Encoder, set : Set<unknown>) {
    return concatArrayBuffers(
        Uint8Array.of(SET).buffer,
        encodeVarint(set.size),
        ...[...set].map(value => encodeImpl(self, value)!)
    )
}

function decodeSet(self : Decoder, buffer : ArrayBuffer) {
    
    const setLength = decodeVarint(self, buffer)
    const result = new Set
    self.referrables.push(result)

    for (let i = 0; i < setLength; i++) {
        const element = decodeImpl(self, buffer)
        result.add(element)
    }
    
    return result
}

function encodeMap(self : Encoder, map : Map<unknown, unknown>) {
    return concatArrayBuffers(
        Uint8Array.of(MAP).buffer,
        encodeVarint(map.size),
        ...[...map].map(([key, value]) =>
            concatArrayBuffers(
                encodeImpl(self, key)!,
                encodeImpl(self, value)!
            )
        )
    )
}

function decodeMap(self : Decoder, buffer : ArrayBuffer) {
    
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
    
    throw new NotSerializableError(error)
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

function encodeError(self : Encoder, error : Error) {
    return concatArrayBuffers(
        Uint8Array.of(tagOfError(error)).buffer,
        encodeString(error.message),
        encodeString(error.stack ?? ''),
        encodeImpl(self, (error as unknown as { cause: unknown } ).cause)!
    )
}

function decodeError(self : Decoder, buffer : ArrayBuffer, typeTag : number) {
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

function encodeArrayBuffer(_ : Encoder, buffer : ArrayBuffer) {
    return concatArrayBuffers(
        Uint8Array.of(ARRAYBUFFER).buffer,
        encodeVarint(buffer.byteLength),
        buffer
    )
}

function decodeArrayBuffer(self : Decoder, buffer : ArrayBuffer) {
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
    
    throw new NotSerializableError(typedArray)
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

function encodeTypedArray(_ : Encoder, typedArray : TypedArray) {
    return concatArrayBuffers(
        Uint8Array.of(tagOfTypedArray(typedArray)).buffer,
        encodeVarint(typedArray.buffer.byteLength),
        encodeVarint(typedArray.byteOffset),
        encodeVarint(typedArray instanceof DataView ? typedArray.byteLength : typedArray.length),
        typedArray.buffer
    )
}

function decodeTypedArray(self : Decoder, buffer : ArrayBuffer, typeTag : number) {
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

function varIntByteCount(num : number) : number {
    
    let byteCount = 1
    while (num >= 0b10000000) {
        num >>>= 7
        byteCount++
    }
    
    return byteCount
}

// benchmarks/varint-encode.ts
function encodeVarint(num : number) {
    
    const byteCount = varIntByteCount(num)
    const arr = new Uint8Array(byteCount)
    
    for (let i = 0; i < byteCount; i++) {
        arr[i] = (num & 0b01111111) | (i === (byteCount - 1) ? 0 : 0b10000000)
        num >>>= 7
    }
    
    return arr.buffer
}

function decodeVarint(self : Decoder, buffer : ArrayBuffer) {
    
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


/***** UTILITY GENERICS *****/

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

