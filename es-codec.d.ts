/***** TYPE TAGS *****/
type Memory = unknown[];
export declare class NotSerializable extends Error {
    readonly value: unknown;
    constructor(value: unknown);
}
export declare function encode(x: unknown, referrables?: Memory): ArrayBuffer;
export declare function decode(buffer: ArrayBuffer, cursor?: {
    offset: number;
}, referrables?: Memory): unknown;
export declare function encodeBigInt(bigint: bigint): ArrayBuffer;
export {};
