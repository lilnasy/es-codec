/***** TYPE TAGS *****/
/***** PUBLIC API *****/
export type Serializable = ExtendedSerializable<never>;
export declare function encode(x: Serializable): ArrayBuffer;
export declare function decode(buffer: ArrayBuffer): Serializable;
export declare class NotSerializable extends Error {
    readonly value: unknown;
    name: "NotSerializableError";
    constructor(value: unknown);
}
export interface Extension<Extended, ReducedType, Context> {
    name: string;
    when: (x: unknown) => x is Extended;
    encode: (extended: Extended, context: Context) => ReducedType;
    decode: (reduced: ReducedType, context: Context) => Extended;
}
export declare function defineExtension<Extended, ReducedType, Context>(extension: Extension<Extended, ReducedType, Context>): Extension<Extended, ReducedType, Context>;
/**
 * A helper function that allows you to easily create a custom
 * codec that uses context. This is only useful for type-checking.
 * It does not do anything at runtime.
 */
export declare function defineContext<Context = Nothing>(): {
    createCodec<Extensions extends Extension<any, any, Context>[]>(extensions: Extensions): {
        encode: If<Equals<Context, typeof nothing>, (input: ExtendedSerializable<ExtractExtended<Extensions>>) => ArrayBuffer, (x: ExtendedSerializable<ExtractExtended<Extensions>>, context: Context) => ArrayBuffer>;
        decode: If<Equals<Context, typeof nothing>, (input: ArrayBuffer) => ExtendedSerializable<ExtractExtended<Extensions>>, (buffer: ArrayBuffer, context: Context) => ExtendedSerializable<ExtractExtended<Extensions>>>;
    };
};
export declare function createCodec<Extensions extends Extension<any, any, undefined>[]>(extensions: Extensions): {
    encode: (input: ExtendedSerializable<ExtractExtended<Extensions>>) => ArrayBuffer;
    decode: (input: ArrayBuffer) => ExtendedSerializable<ExtractExtended<Extensions>>;
};
/***** TYPES *****/
type BaseSerializablePrimitives = null | undefined | boolean | number | bigint | string;
type BaseSerializableObjects = Date | RegExp;
type BaseSerializableErrors = Error | EvalError | RangeError | SyntaxError | ReferenceError | TypeError | URIError;
type BaseSerializableMemory = ArrayBuffer | DataView | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | BigInt64Array | BigUint64Array;
type BaseSerializable = BaseSerializablePrimitives | BaseSerializableObjects | BaseSerializableErrors | BaseSerializableMemory;
type SerializableContainers<Element> = Element[] | Set<Element> | symbol extends Element ? Record<string | number | symbol, Element> : Record<string | number, Element> | Map<Element, Element>;
type ExtendedSerializable<AdditionalTypes> = BaseSerializable | AdditionalTypes | SerializableContainers<BaseSerializable | AdditionalTypes>;
/***** IMPLEMENTATION - EXTENSIONS *****/
/**
 * This is a unique "type" for internal use by es-codec.
 * It is used as a default for when the user does not explicitly
 * provide context for use by extensions. It will be interpreted
 * as an instruction to hide the context argument from the types
 * of the encode and decode functions.
 */
type Nothing = typeof nothing;
declare const nothing: unique symbol;
type If<Condition, Then, Else> = Condition extends true ? Then : Else;
type Equals<Left, Right> = Left extends Right ? Right extends Left ? true : false : false;
type ExtractExtended<Extensions extends unknown[]> = Extensions[number] extends {
    encode(x: infer Extended, context: any): any;
} ? Extended : never;
export {};
