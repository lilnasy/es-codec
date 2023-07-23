/***** TYPE TAGS *****/
const NULL = 0b00000001;
const UNDEFINED = 0b00000010;
const TRUE = 0b00000011;
const FALSE = 0b00000100;
const REFERENCE = 0b00000101;
const NUMBER = 0b00000110;
const DATE = 0b00000111;
const REGEXP = 0b00001000;
const STRING = 0b00001001;
const BIGINTN = 0b00001010;
const BIGINTP = 0b00001011;
const ARRAY = 0b00001100;
const OBJECT = 0b00001101;
const SET = 0b00001110;
const MAP = 0b00001111;
const _RECORD = 0b00010000; // https://github.com/tc39/proposal-record-tuple
const _TUPLE = 0b00010001;
const ERROR = 0b00100000;
const EVAL_ERROR = 0b00100001;
const RANGE_ERROR = 0b00100010;
const REFERENCE_ERROR = 0b00100011;
const SYNTAX_ERROR = 0b00100100;
const TYPE_ERROR = 0b00100101;
const URI_ERROR = 0b00100110;
const ARRAYBUFFER = 0b01000000;
const DATAVIEW = 0b01000001;
const INT8ARRAY = 0b01000010;
const UINT8ARRAY = 0b01000011;
const UINT8CLAMPEDARRAY = 0b01000100;
const INT16ARRAY = 0b01000101;
const UINT16ARRAY = 0b01000110;
const INT32ARRAY = 0b01000111;
const UINT32ARRAY = 0b01001000;
const FLOAT32ARRAY = 0b01001001;
const FLOAT64ARRAY = 0b01001010;
const BIGINT64ARRAY = 0b01001011;
const BIGUINT64ARRAY = 0b01001100;
const EXTENSION = 0b10000000;
/***** PUBLIC API *****/
export class NotSerializable extends Error {
    value;
    name = "NotSerializableError";
    constructor(value) {
        super();
        this.value = value;
    }
}
export function createCodec(extensions) {
    if (extensions.length > 128)
        throw new Error("es-codec: createCodec: The number of extensions must be less than 128. Found: " + extensions.length);
    const extensionsInternal = new Array;
    for (const ext of extensions) {
        extensionsInternal.push({
            name: ext.name,
            when: ext.when,
            encodeImpl(self, x) {
                return concatArrayBuffers(Uint8Array.of(EXTENSION).buffer, encodeImpl(self, ext.name), encodeImpl(self, ext.encode(x, self.context)));
            },
            decodeImpl(self, buffer) {
                const result = ext.decode(decodeImpl(self, buffer), self.context);
                self.referrables.push(result);
                return result;
            }
        });
    }
    function encode(x, context) {
        return encodeImpl({ referrables: [], extensions: extensionsInternal, context }, x);
    }
    function decode(buffer, context) {
        return decodeImpl({ offset: 0, referrables: [], extensions: extensionsInternal, context }, buffer);
    }
    return { encode, decode };
}
export function encode(x) {
    return encodeImpl({ referrables: [], extensions: [], context: undefined }, x);
}
export function decode(buffer) {
    return decodeImpl({ offset: 0, referrables: [], extensions: [], context: undefined }, buffer);
}
class Unreachable extends Error {
    name = "UnreachableError";
}
/***** IMPLEMENTATION *****/
function encodeImpl(self, x) {
    /* unique types */
    if (x === null)
        return Uint8Array.of(NULL).buffer;
    if (x === undefined)
        return Uint8Array.of(UNDEFINED).buffer;
    if (x === true)
        return Uint8Array.of(TRUE).buffer;
    if (x === false)
        return Uint8Array.of(FALSE).buffer;
    /* simple types */
    if (x.constructor === Number)
        return encodeNumber(x);
    if (x.constructor === Date)
        return encodeDate(x);
    if (x.constructor === RegExp)
        return encodeRegex(x);
    /* lengthy types */
    if (x.constructor === BigInt)
        return encodeBigInt(x);
    if (x.constructor === String)
        return encodeString(x);
    /* container types */
    if (x.constructor === Array)
        return maybeEncodeReference(self, x, encodeArray);
    if (x.constructor === Object)
        return maybeEncodeReference(self, x, encodeObject);
    if (x.constructor === Set)
        return maybeEncodeReference(self, x, encodeSet);
    if (x.constructor === Map)
        return maybeEncodeReference(self, x, encodeMap);
    /* error types */
    if (x instanceof Error)
        return maybeEncodeReference(self, x, encodeError);
    /* low-level types */
    if (x.constructor === ArrayBuffer)
        return maybeEncodeReference(self, x, encodeArrayBuffer);
    if (ArrayBuffer.isView(x))
        return maybeEncodeReference(self, x, encodeTypedArray);
    /* extension types */
    for (const extension of self.extensions)
        if (extension.when(x, self.context) === true)
            return maybeEncodeReference(self, x, extension.encodeImpl);
    throw new NotSerializable(x);
}
function decodeImpl(self, buffer) {
    const view = new DataView(buffer, self.offset);
    const typeTag = view.getUint8(0);
    self.offset += 1;
    if (typeTag === NULL)
        return null;
    if (typeTag === UNDEFINED)
        return undefined;
    if (typeTag === TRUE)
        return true;
    if (typeTag === FALSE)
        return false;
    if (typeTag === REFERENCE)
        return decodeReference(self, buffer);
    if (typeTag === NUMBER)
        return decodeNumber(self, buffer);
    if (typeTag === DATE)
        return decodeDate(self, buffer);
    if (typeTag === REGEXP)
        return decodeRegex(self, buffer);
    if (typeTag === BIGINTP)
        return decodeBigInt(self, buffer);
    if (typeTag === BIGINTN)
        return -decodeBigInt(self, buffer);
    if (typeTag === STRING)
        return decodeString(self, buffer);
    if (typeTag === ARRAY)
        return decodeArray(self, buffer);
    if (typeTag === OBJECT)
        return decodeObject(self, buffer);
    if (typeTag === SET)
        return decodeSet(self, buffer);
    if (typeTag === MAP)
        return decodeMap(self, buffer);
    if (typeTag & ERROR)
        return decodeError(self, buffer, typeTag);
    if (typeTag === ARRAYBUFFER)
        return decodeArrayBuffer(self, buffer);
    if (typeTag & ARRAYBUFFER)
        return decodeTypedArray(self, buffer, typeTag);
    if (typeTag & EXTENSION) {
        const name = decodeImpl(self, buffer);
        for (const ext of self.extensions)
            if (ext.name === name)
                return ext.decodeImpl(self, buffer);
    }
    throw new Unreachable;
}
function maybeEncodeReference(self, x, encoder) {
    const alreadyEncoded = self.referrables.indexOf(x);
    if (alreadyEncoded === -1) {
        self.referrables.push(x);
        return encoder(self, x);
    }
    return encodeReference(alreadyEncoded);
}
function encodeReference(reference) {
    return concatArrayBuffers(Uint8Array.of(REFERENCE), encodeVarint(reference).buffer);
}
function decodeReference(self, buffer) {
    const reference = decodeVarint(self, buffer);
    return self.referrables[reference];
}
function encodeNumber(number) {
    const buffer = new ArrayBuffer(9);
    const view = new DataView(buffer);
    view.setUint8(0, NUMBER);
    view.setFloat64(1, number);
    return buffer;
}
function decodeNumber(self, buffer) {
    const view = new DataView(buffer, self.offset);
    self.offset += 8;
    return view.getFloat64(0);
}
function encodeDate(date) {
    const buffer = new ArrayBuffer(9);
    const view = new DataView(buffer);
    view.setUint8(0, DATE);
    view.setFloat64(1, date.getTime());
    return buffer;
}
function decodeDate(self, buffer) {
    const view = new DataView(buffer, self.offset);
    self.offset += 8;
    return new Date(view.getFloat64(0));
}
function encodeRegex(regex) {
    return concatArrayBuffers(Uint8Array.of(REGEXP).buffer, encodeString(regex.source), encodeString(regex.flags));
}
function decodeRegex(self, buffer) {
    self.offset += 1; // skip reading the string type tag
    const source = decodeString(self, buffer);
    self.offset += 1; // skip reading the string type tag
    const flags = decodeString(self, buffer);
    return new RegExp(source, flags);
}
// benchmarks/bigint-encode.ts
function encodeBigInt(bigint) {
    const negative = bigint < 0n;
    let b = negative ? -bigint : bigint;
    let uint64Count = 0;
    while (b > 0n) {
        uint64Count++;
        b >>= 64n;
    }
    if (uint64Count > 255)
        throw new NotSerializable(bigint);
    const buffer = new ArrayBuffer(2 + 8 * uint64Count);
    const view = new DataView(buffer);
    view.setUint8(0, negative ? BIGINTN : BIGINTP);
    view.setUint8(1, uint64Count);
    if (negative)
        bigint *= -1n;
    let offset = 2;
    while (bigint > 0n) {
        const uint64 = bigint & 0xffffffffffffffffn;
        view.setBigUint64(offset, uint64);
        offset += 8;
        bigint >>= 64n;
    }
    return buffer;
}
function decodeBigInt(self, buffer) {
    const view = new DataView(buffer);
    const length = view.getUint8(self.offset);
    self.offset += 1;
    let bigint = 0n;
    let shift = 0n;
    for (let i = 0; i < length; i++) {
        bigint |= view.getBigUint64(self.offset) << shift;
        self.offset += 8;
        shift += 64n;
    }
    return bigint;
}
function encodeString(string) {
    const encodedBuffer = new TextEncoder().encode(string).buffer;
    return concatArrayBuffers(Uint8Array.of(STRING).buffer, encodeVarint(encodedBuffer.byteLength).buffer, encodedBuffer);
}
function decodeString(self, buffer) {
    const textBufferLength = decodeVarint(self, buffer);
    const decodedString = new TextDecoder().decode(new Uint8Array(buffer, self.offset, textBufferLength));
    self.offset += textBufferLength;
    return decodedString;
}
function encodeArray(self, array) {
    if (array.length !== Object.keys(array).length)
        throw new NotSerializable(array);
    return concatArrayBuffers(Uint8Array.of(ARRAY).buffer, encodeVarint(array.length).buffer, ...array.map(x => encodeImpl(self, x)));
}
function decodeArray(self, buffer) {
    const result = [];
    self.referrables.push(result);
    const arrayLength = decodeVarint(self, buffer);
    for (let i = 0; i < arrayLength; i++)
        result.push(decodeImpl(self, buffer));
    return result;
}
function encodeObject(self, object) {
    const keys = Object.keys(object);
    return concatArrayBuffers(Uint8Array.of(OBJECT).buffer, encodeVarint(keys.length).buffer, ...keys.map(key => concatArrayBuffers(encodeString(key), encodeImpl(self, object[key]))));
}
function decodeObject(self, buffer) {
    const objectLength = decodeVarint(self, buffer);
    const result = {};
    self.referrables.push(result);
    for (let i = 0; i < objectLength; i++) {
        // ignore the tag for the key, go directly to decoding it as a string
        self.offset += 1;
        const key = decodeString(self, buffer);
        result[key] = decodeImpl(self, buffer);
    }
    return result;
}
function encodeSet(self, set) {
    return concatArrayBuffers(Uint8Array.of(SET).buffer, encodeVarint(set.size).buffer, ...[...set].map(value => encodeImpl(self, value)));
}
function decodeSet(self, buffer) {
    const setLength = decodeVarint(self, buffer);
    const result = new Set;
    self.referrables.push(result);
    for (let i = 0; i < setLength; i++) {
        const element = decodeImpl(self, buffer);
        result.add(element);
    }
    return result;
}
function encodeMap(self, map) {
    return concatArrayBuffers(Uint8Array.of(MAP).buffer, encodeVarint(map.size).buffer, ...[...map].map(([key, value]) => concatArrayBuffers(encodeImpl(self, key), encodeImpl(self, value))));
}
function decodeMap(self, buffer) {
    const mapLength = decodeVarint(self, buffer);
    const result = new Map;
    self.referrables.push(result);
    for (let i = 0; i < mapLength; i++) {
        const key = decodeImpl(self, buffer);
        const value = decodeImpl(self, buffer);
        result.set(key, value);
    }
    return result;
}
function tagOfError(error) {
    const constructor = error.constructor;
    if (constructor === Error)
        return ERROR;
    if (constructor === EvalError)
        return EVAL_ERROR;
    if (constructor === RangeError)
        return RANGE_ERROR;
    if (constructor === ReferenceError)
        return REFERENCE_ERROR;
    if (constructor === SyntaxError)
        return SYNTAX_ERROR;
    if (constructor === TypeError)
        return TYPE_ERROR;
    if (constructor === URIError)
        return URI_ERROR;
    throw new NotSerializable(error);
}
function constructorOfError(tag) {
    if (tag === ERROR)
        return Error;
    if (tag === EVAL_ERROR)
        return EvalError;
    if (tag === RANGE_ERROR)
        return RangeError;
    if (tag === REFERENCE_ERROR)
        return ReferenceError;
    if (tag === SYNTAX_ERROR)
        return SyntaxError;
    if (tag === TYPE_ERROR)
        return TypeError;
    if (tag === URI_ERROR)
        return URIError;
    throw new Unreachable;
}
function encodeError(self, error) {
    return concatArrayBuffers(Uint8Array.of(tagOfError(error)).buffer, encodeString(error.message), encodeString(error.stack ?? ''), encodeImpl(self, error.cause));
}
function decodeError(self, buffer, typeTag) {
    // ignore the tag for the message, go directly to decoding it as a string
    self.offset += 1;
    const message = decodeString(self, buffer);
    // ignore the tag for the stack, go directly to decoding it as a string
    self.offset += 1;
    const stack = decodeString(self, buffer);
    const cause = decodeImpl(self, buffer);
    const error = cause === undefined
        ? new (constructorOfError(typeTag))(message)
        // @ts-ignore error cause has been supported by every major runtime since 2021
        : new (constructorOfError(typeTag))(message, { cause });
    error.stack = stack;
    return error;
}
function encodeArrayBuffer(_, buffer) {
    return concatArrayBuffers(Uint8Array.of(ARRAYBUFFER).buffer, encodeVarint(buffer.byteLength).buffer, buffer);
}
function decodeArrayBuffer(self, buffer) {
    const bufferLength = decodeVarint(self, buffer);
    const decodedBuffer = buffer.slice(self.offset, self.offset + bufferLength);
    self.offset += bufferLength;
    self.referrables.push(decodedBuffer);
    return decodedBuffer;
}
function tagOfTypedArray(typedArray) {
    const constructor = typedArray.constructor;
    if (constructor === DataView)
        return DATAVIEW;
    if (constructor === Int8Array)
        return INT8ARRAY;
    if (constructor === Uint8Array)
        return UINT8ARRAY;
    if (constructor === Uint8ClampedArray)
        return UINT8CLAMPEDARRAY;
    if (constructor === Int16Array)
        return INT16ARRAY;
    if (constructor === Uint16Array)
        return UINT16ARRAY;
    if (constructor === Int32Array)
        return INT32ARRAY;
    if (constructor === Uint32Array)
        return UINT32ARRAY;
    if (constructor === Float32Array)
        return FLOAT32ARRAY;
    if (constructor === Float64Array)
        return FLOAT64ARRAY;
    if (constructor === BigInt64Array)
        return BIGINT64ARRAY;
    if (constructor === BigUint64Array)
        return BIGUINT64ARRAY;
    throw new NotSerializable(typedArray);
}
function constructorOfTypedArray(typeTag) {
    if (typeTag === DATAVIEW)
        return DataView;
    if (typeTag === INT8ARRAY)
        return Int8Array;
    if (typeTag === UINT8ARRAY)
        return Uint8Array;
    if (typeTag === UINT8CLAMPEDARRAY)
        return Uint8ClampedArray;
    if (typeTag === INT16ARRAY)
        return Int16Array;
    if (typeTag === UINT16ARRAY)
        return Uint16Array;
    if (typeTag === INT32ARRAY)
        return Int32Array;
    if (typeTag === UINT32ARRAY)
        return Uint32Array;
    if (typeTag === FLOAT32ARRAY)
        return Float32Array;
    if (typeTag === FLOAT64ARRAY)
        return Float64Array;
    if (typeTag === BIGINT64ARRAY)
        return BigInt64Array;
    if (typeTag === BIGUINT64ARRAY)
        return BigUint64Array;
    throw new Unreachable;
}
function encodeTypedArray(_, typedArray) {
    return concatArrayBuffers(Uint8Array.of(tagOfTypedArray(typedArray)).buffer, encodeVarint(typedArray.buffer.byteLength).buffer, encodeVarint(typedArray.byteOffset).buffer, encodeVarint(typedArray instanceof DataView ? typedArray.byteLength : typedArray.length).buffer, typedArray.buffer);
}
function decodeTypedArray(self, buffer, typeTag) {
    const bufferLength = decodeVarint(self, buffer);
    const byteOffset = decodeVarint(self, buffer);
    const viewLength = decodeVarint(self, buffer);
    const sourceBuffer = buffer.slice(self.offset, self.offset + bufferLength);
    self.offset += bufferLength;
    const TypedArray = constructorOfTypedArray(typeTag);
    const decodedView = new TypedArray(sourceBuffer, byteOffset, viewLength);
    self.referrables.push(decodedView);
    return decodedView;
}
function varIntByteCount(num) {
    let byteCount = 1;
    while (num >= 0b10000000) {
        num >>>= 7;
        byteCount++;
    }
    return byteCount;
}
// benchmarks/varint-encode.ts
function encodeVarint(num) {
    const byteCount = varIntByteCount(num);
    const arr = new Uint8Array(byteCount);
    for (let i = 0; i < byteCount; i++) {
        arr[i] = (num & 0b01111111) | (i === (byteCount - 1) ? 0 : 0b10000000);
        num >>>= 7;
    }
    return arr;
}
function decodeVarint(self, buffer) {
    const byteArray = new Uint8Array(buffer, self.offset);
    let num = 0;
    let shift = 0;
    for (let i = 0; i < byteArray.length; i++) {
        const varIntPart = byteArray[i];
        self.offset += 1;
        num |= (varIntPart & 0b01111111) << shift;
        if ((varIntPart & 0b10000000) === 0)
            return num;
        shift += 7;
    }
    throw new Unreachable;
}
function concatArrayBuffers(...buffers) {
    let cumulativeSize = 0;
    for (const buffer of buffers)
        cumulativeSize += buffer.byteLength;
    const result = new Uint8Array(cumulativeSize);
    let offset = 0;
    for (const buffer of buffers) {
        result.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
    }
    return result.buffer;
}
//# sourceMappingURL=es-codec.js.map