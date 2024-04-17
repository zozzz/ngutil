import { MergeUnion } from "./merge-union"

export type MaxRecursion = 10

// const ᗅͶỾ = Symbol("__any__")

// interface AnyObject {
//     ᗅͶỾ: boolean
// }

// export type IsAny<T> = AnyObject extends T ? true : false
export type IfAny<O, T, F> = 0 extends 1 & O ? T : F
export type IsAny<T> = IfAny<T, true, false>

export type IfTuple<O, T, F, E = never> =
    O extends Array<any> ? (-1 extends O["length"] ? F : O["length"] extends 0 ? E : T) : F
export type IsTuple<T, E = never> = IfTuple<T, true, false, E>

/**
 * @example
 * ```ts
 * type Tuple = TupleEntries<[1, "ok", false]>
 * Tuple = {0: 1, 1: "ok", 2: false}
 * ```
 */
export type TupleItems<T> = T extends Array<any> ? MergeUnion<_TupleItems<T>> : never

type _TupleItems<
    T extends any[],
    K extends number[] = [],
    O extends { [key: string]: number } = never
> = T["length"] extends K["length"]
    ? O
    : _TupleItems<T, [...K, K["length"]], O | { [key in K["length"]]: T[K["length"]] }>

// TODO:
// export type ExcludeAny<T, U = Unionize<{ [key: string]: T }>> = { [K in keyof U]: IfAny<U[K], never, U[K]> }[keyof U]
// export type ExcludeAny<T> = Array<T>[number]

export type ObjectKey = string | number | symbol
// export type PlainObject<KT extends ObjectKey = ObjectKey> = { [key in KT]: any }
// export type IfPlainObject<O, T, F> = O extends { [key: ObjectKey]: any }
//     ? ExcludeAny<O[keyof O]> extends never
//         ? T
//         : F
//     : F
// export type IsPlainObject<T> = IfPlainObject<T, true, false>

// export type IfPlainArray<O, T, F> = O extends Array<any> ? (ExcludeAny<O[number]> extends never ? T : F) : F
// export type IsPlainArray<T> = IfPlainArray<T, true, false>

/**
 * Evaulate type expressions
 *
 * ```ts
 * export type KeyOf<T> = Eval<{ [K in keyof T]: T[K] extends never ? never : K }[keyof T]>
 * ```
 */
export type Eval<T> = Array<T>[number]

// const exca1: ExcludeAny<any> = null
// const exca2: ExcludeAny<string | any> = "nice"
// const exca3: ExcludeAny<"p1" | "p2" | any> = "p2"
// const exca4: ExcludeAny<"p1" | "p2"> = "p2"

// // type X<T> = IsAny<T> extends true ? "T" : "F"

// // const isAnyCheck: X<unknown> = "F"
// // const isAnyCheck2: X<any> = "T"
// // const isAnyCheck3: X<{ [key: string]: any }> = "F"
// const po1: IsPlainObject<{ [key: string]: any }> = true
// const po2: IsPlainObject<{ p1: boolean; p2: string }> = false
// const po3: IsPlainObject<{ p1: boolean; p2: any }> = false
