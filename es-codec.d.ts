/***** TYPE TAGS *****/
export declare class NotSerializable extends Error {
    readonly value: unknown;
    constructor(value: unknown);
}
export declare function encode(x: unknown): ArrayBuffer;
export declare function decode(buffer: ArrayBuffer): unknown;
