/***** PUBLIC API *****/
/**
 * A union of all the types that es-codec can encode out of the box.
 */
export type Serializable = ExtendedSerializable<never>;
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
export declare function encode(x: Serializable): ArrayBuffer;
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
export declare function decode(buffer: ArrayBuffer): Serializable;
/**
 * Thrown by `encode` if a value or one if its contained value is not supported and support was not added via an extension.
 */
export declare class NotSerializableError extends Error {
    readonly value: unknown;
    name: "NotSerializableError";
    constructor(value: unknown);
}
/**
 * Thrown by `encode` if a bigint is larger than 2kB.
 */
export declare class BigIntTooLargeError extends Error {
    readonly bigint: bigint;
    name: "BigIntTooLargeError";
    constructor(bigint: bigint);
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
export declare class MalformedArrayError extends Error {
    readonly array: Array<unknown>;
    name: "MalformedArrayError";
    constructor(array: Array<unknown>);
}
/**
 * Thrown by `decode` if one of the values was encoded using an extension not available to the current codec.
 */
export declare class IncompatibleCodec extends Error {
    readonly extensionName: string;
    name: "IncompatibleCodecError";
    constructor(extensionName: string);
}
export interface Extension<Extended, ReducedType, Context> {
    /**
     * This will be used as the tag in the serialized representation. When deserializing, the tag is used to identify the extension that should be used for decoding.
     */
    name: string;
    /**
     * This is a function that receives an unsupported object as the argument. It should return true if the extension can encode the provided object.
     */
    when(x: unknown): x is Extended;
    /**
     * This is a function that receives all unsupported objects for which `when` returned true. You can "reduce" your custom type in terms of other types that are supported. For example, you can encode a `Graph` as `{ edges: Array<Edge>, nodes: Array<Node> }`. Another extension can encode an `Edge` as `[ from : number, to: number ]`.
     */
    encode(extended: Extended, context: Context): ReducedType;
    /**
     * This is a function that receives the "reduced" representation created by the extension's `encode` and reconstructs your custom type from it.
     */
    decode(reduced: ReducedType, context: Context): Extended;
}
/**
 * A helper function that allows you to easily create an extension and let TypeScript infer the types.
 * This is only useful for type-checking; it returns the provided object as-is.
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
export declare function defineExtension<Extended, ReducedType, Context>(extension: Extension<Extended, ReducedType, Context>): Extension<Extended, ReducedType, Context>;
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
export declare function defineContext<Context = NoContext>(): {
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
    createCodec<Extensions extends Extension<any, any, Context>[]>(extensions: Extensions): {
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
        encode: If<Equals<Context, typeof NoContext>, (input: ExtendedSerializable<ExtractExtended<Extensions>>) => ArrayBuffer, (x: ExtendedSerializable<ExtractExtended<Extensions>>, context: Context) => ArrayBuffer>;
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
        decode: If<Equals<Context, typeof NoContext>, (input: ArrayBuffer) => ExtendedSerializable<ExtractExtended<Extensions>>, (buffer: ArrayBuffer, context: Context) => ExtendedSerializable<ExtractExtended<Extensions>>>;
    };
};
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
export declare function createCodec<Extensions extends Extension<any, any, undefined>[]>(extensions: Extensions): {
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
    encode: (input: ExtendedSerializable<ExtractExtended<Extensions>>) => ArrayBuffer;
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
    decode: (input: ArrayBuffer) => ExtendedSerializable<ExtractExtended<Extensions>>;
};
/***** TYPES AND INTERFACES *****/
type BaseSerializablePrimitives = null | undefined | boolean | number | bigint | string;
type BaseSerializableObjects = Date | RegExp;
type BaseSerializableErrors = Error | EvalError | RangeError | SyntaxError | ReferenceError | TypeError | URIError;
type BaseSerializableMemory = ArrayBuffer | DataView | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | BigInt64Array | BigUint64Array;
type BaseSerializable = BaseSerializablePrimitives | BaseSerializableObjects | BaseSerializableErrors | BaseSerializableMemory;
type ExtendedSerializable<AdditionalTypes> = BaseSerializable | AdditionalTypes | (BaseSerializable | AdditionalTypes)[] | Set<BaseSerializable | AdditionalTypes> | Map<BaseSerializable | AdditionalTypes, BaseSerializable | AdditionalTypes> | {
    [_ in (string | number | symbol extends AdditionalTypes ? symbol : never)]: BaseSerializable | AdditionalTypes;
};
/***** IMPLEMENTATION - EXTENSIONS *****/
/**
 * This is a unique "type" for internal use by es-codec.
 * It is used as a default for when the user does not explicitly
 * provide context for use by extensions. It will be interpreted
 * as an instruction to hide the context argument from the types
 * of the encode and decode functions.
 */
type NoContext = typeof NoContext;
declare const NoContext: unique symbol;
/***** UTILITY GENERICS *****/
type If<Condition, Then, Else> = Condition extends true ? Then : Else;
type Equals<Left, Right> = Left extends Right ? Right extends Left ? true : false : false;
type ExtractExtended<Extensions extends unknown[]> = Extensions[number] extends {
    encode(x: infer Extended, context: any): any;
} ? Extended : never;
export {};
