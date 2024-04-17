import { Primitive } from "./primitive"
import { IsAny, IsTuple, MaxRecursion } from "./util"

export type DeepReadonly<T, D extends number = MaxRecursion> = _DeepReadonly<T, [], D>

type _DeepReadonly<T, P extends number[], D extends number> = P["length"] extends D
    ? never
    : IsAny<T> extends true
      ? any
      : T extends Primitive | ((...args: any[]) => any)
        ? T
        : T extends Date
          ? ReadonlyDate
          : T extends Array<infer V>
            ? IsTuple<T> extends true
                ? _DeepReadonlyTuple<T, P, D>
                : _DeepReadonlyArray<V, P, D>
            : T extends Map<infer MK, infer MV>
              ? _DeepReadonlyMap<MK, MV, P, D>
              : T extends Set<infer V>
                ? _DeepReadonlySet<V, P, D>
                : T extends object
                  ? _DeepReadonlyObject<T, P, D>
                  : T

type _DeepReadonlyTuple<T extends any[], P extends number[], D extends number> = _ReadonlyTuple<T, [], [], P, D>

type _ReadonlyTuple<
    T extends any[],
    K extends number[],
    R extends readonly any[],
    P extends number[],
    D extends number
> = T["length"] extends K["length"]
    ? R
    : _ReadonlyTuple<T, [...K, K["length"]], readonly [...R, _DeepReadonly<T[K["length"]], [...P, 0], D>], P, D>

type _DeepReadonlyArray<T, P extends number[], D extends number> = ReadonlyArray<
    IsAny<T> extends true ? any : _DeepReadonly<T, [...P, 0], D>
>

type _DeepReadonlyObject<T extends object, P extends number[], D extends number> = {
    readonly [K in keyof T]: IsAny<T[K]> extends true ? any : _DeepReadonly<T[K], [...P, 0], D>
}

type _DeepReadonlyMap<K, V, P extends number[], D extends number> = ReadonlyMap<K, _DeepReadonly<V, [...P, 0], D>>

type _DeepReadonlySet<V, P extends number[], D extends number> = ReadonlySet<_DeepReadonly<V, [...P, 0], D>>

export type ReadonlyDate = Omit<
    Date,
    | "setTime"
    | "setMilliseconds"
    | "setUTCMilliseconds"
    | "setSeconds"
    | "setUTCSeconds"
    | "setMinutes"
    | "setUTCMinutes"
    | "setHours"
    | "setUTCHours"
    | "setDate"
    | "setUTCDate"
    | "setMonth"
    | "setUTCMonth"
    | "setFullYear"
    | "setUTCFullYear"
>

// const o1: DeepReadonly<{ alma: 1; xyz: number }> = { alma: 1, xyz: 20 }
// o1.xyz = 10

// const a1: DeepReadonly<Array<number>> = [1]
// a1[0] = 10

// const t1: DeepReadonly<[1, "ok", true, { nice: number }]> = [1, "ok", true, { nice: 10 }]
// t1[0] = 1
// t1[3].nice = 10
// t1.push()

// const t2: DeepReadonly<[1, any]> = [1, "ok", true, { nice: 10 }]
// t2[0] = 1

// const m1: DeepReadonly<Map<string, { nice: boolean }>> = new Map()
// m1.set("x", { nice: true })

// interface Rec {
//     id: number
//     parent: Rec
// }

// const r1: DeepReadonly<Rec> = {} as any
// r1.id = 10
// r1.parent.parent.parent = 10

// const d1: DeepReadonly<Date> = new Date()
