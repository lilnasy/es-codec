/***** TYPE TAGS *****/
/***** PUBLIC API *****/
export declare class NotSerializable extends Error {
    readonly value: unknown;
    name: "NotSerializableError";
    constructor(value: unknown);
}
export interface Extension<T, ReducedType> {
    name: string;
    when: (x: unknown) => x is T;
    encode: (x: T) => ReducedType;
    decode: (buffer: ReducedType) => T;
}
export declare function createCodec(extensions: Extension<unknown, unknown>[]): {
    encode: (x: unknown) => ArrayBuffer;
    decode: (buffer: ArrayBuffer) => unknown;
};
export declare function encode(x: unknown): ArrayBuffer;
export declare function decode(buffer: ArrayBuffer): unknown;
