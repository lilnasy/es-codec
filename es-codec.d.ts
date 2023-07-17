/***** TYPE TAGS *****/
/***** PUBLIC API *****/
export declare class NotSerializable extends Error {
    readonly value: unknown;
    name: string;
    constructor(value: unknown);
}
export interface Extension<T> {
    when: (x: unknown) => x is T;
    encode: (x: T) => ArrayBuffer;
    decode: (buffer: ArrayBuffer) => T;
}
export declare function createCodec(extensions: Extension<unknown>[]): {
    encode: (x: unknown) => ArrayBuffer;
    decode: (buffer: ArrayBuffer) => unknown;
};
export declare function encode(x: unknown): ArrayBuffer;
export declare function decode(buffer: ArrayBuffer): unknown;
