// @ts-ignore
import { encodeBigInt } from "../src/index.ts"

function stringCastToFindBufferLength(bigint : bigint) {
    const uint64Count = Math.ceil(bigint.toString(16).length / 16)
    const buffer = new ArrayBuffer(2 + 8 * uint64Count)
    const view = new DataView(buffer)
    
    view.setUint8(0, 11)
    view.setUint8(1, uint64Count)
    
    let offset = 2
    while (bigint > 0n) {
        const value = bigint & 0xffffffffffffffffn
        view.setBigUint64(offset, value)
        offset += 8
        bigint >>= 64n
    }
    
    return buffer
}

globalThis?.Deno?.bench?.('control', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = BigInt(Math.abs((Math.random() * 10**17) << 32))
    }
})

globalThis?.Deno?.bench?.('incumbent', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = BigInt(Math.abs((Math.random() * 10**17) << 32))
        encodeBigInt(rand)
    }
})

globalThis?.Deno?.bench?.('alternative', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = BigInt(Math.abs((Math.random() * 10**17) << 32))
        stringCastToFindBufferLength(rand)
    }
})
