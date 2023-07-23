/***** TYPE TAGS *****/
/***** PUBLIC API *****/
export declare class NotSerializable extends Error {
    readonly value: unknown;
    name: "NotSerializableError";
    constructor(value: unknown);
}
export interface Extension<Extended, ReducedType, Context> {
    name: string;
    when: (x: unknown, context: Context) => x is Extended;
    encode: (x: Extended, context: Context) => ReducedType;
    decode: (buffer: ReducedType, context: Context) => Extended;
}
export declare function createCodec<Context = unknown>(extensions: Extension<unknown, unknown, unknown>[]): {
    encode: (x: unknown, context: Context) => ArrayBuffer;
    decode: (buffer: ArrayBuffer, context: Context) => unknown;
};
export declare function encode(x: unknown): ArrayBuffer;
export declare function decode(buffer: ArrayBuffer): unknown;
