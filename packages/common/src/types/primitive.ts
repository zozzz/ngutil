import { isPrimitive, Primitive } from "utility-types"

import { IsAny } from "./util"

export { Primitive, isPrimitive }

// eslint-disable-next-line @typescript-eslint/ban-types
export type Builtins = Primitive | Function | Date

export type ToPrimitiveMap = {
    string: string
    default: string
    number: number
    bigint: bigint
    boolean: boolean
    symbol: symbol
}

type AsString<T, P, F = never> = P extends string ? (T extends Primitive ? P : F) : never

// type HasToString<T, P, F = never> = P extends Primitive ? string : T extends { toString(): string } ? string : F

type HasValueOf<T, P, F = never> = T extends { valueOf(): P } ? P : F

type HasToPrimitive<T, P, F = never> = T extends { [Symbol.toPrimitive](hint: string): P } ? P : F

type _AsPrimitive<T, P> = HasToPrimitive<T, P, HasValueOf<T, P, AsString<T, P>>>

export type AsPrimitive<T> =
    IsAny<T> extends true
        ? ToPrimitiveMap[keyof ToPrimitiveMap]
        : { [K in keyof ToPrimitiveMap]: _AsPrimitive<T, ToPrimitiveMap[K]> }[keyof ToPrimitiveMap]
