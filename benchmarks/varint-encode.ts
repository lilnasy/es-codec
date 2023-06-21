// @ts-ignore
import { encodeVarint } from "../src/index.ts"

function intermediateArrayAllocation(num : number) {
    const result = new Array<number>
    while (num >= 0x80) {
        result.push((num & 0x7f) | 0x80)
        num >>>= 7
    }
    result.push(num)
    return new Uint8Array(result)
}

globalThis?.Deno?.bench?.('control', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = Math.abs((Math.random() * 10**17) << 32)
    }
})

globalThis?.Deno?.bench?.('incumbent', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = Math.abs((Math.random() * 10**17) << 32)
        encodeVarint(rand)
    }
})

globalThis?.Deno?.bench?.('alternative', _ => {
    for (let i = 0; i < 100000; i++) {
        const rand = Math.abs((Math.random() * 10**17) << 32)
        intermediateArrayAllocation(rand)
    }
})