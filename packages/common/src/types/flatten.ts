/* eslint-disable @typescript-eslint/ban-types */
import { Concat } from "./concat"
import { MergeUnion } from "./merge-union"
import { Builtins } from "./primitive"
import { IsAny, IsTuple, MaxRecursion, TupleItems } from "./util"

type KeyTypes = string | number
export type FlattenExclude = Function

/**
 * @param T - The object witch we want to flatten
 * @param P - The prefix of paths (default: [])
 * @param E - The value excludes (default: Function)
 * @param D - Max depth (default: 10)
 *
 * @example
 * Input type:
 * ```ts
 * interface User {
 *   id: number
 *   name: string
 * }
 *
 * interface Category {
 *   id: number
 *   title: string
 * }
 *
 * interface Article {
 *   id: number
 *   title: string
 *   author: User
 *   categories: Array<Category>
 * }
 * ```
 *
 * Result type:
 * type F = Flatten<Article> = {
 *   "id": number,
 *   "title": number,
 *   "author.id": number,
 *   "author.name": string,
 *   "categories.*.id": number,
 *   "categories.*.title": string,
 * }
 */
export type Flatten<T, P extends string[] = [], E = FlattenExclude, D extends number = MaxRecursion> = _Flatten<
    T,
    E,
    P,
    D
>

type _Flatten<T, E, P extends string[], D extends number> = MergeUnion<_FlattenItem<T, E, P, D>>

type _FlattenItem<T, E, P extends string[], D extends number> = P["length"] extends D
    ? never
    : T extends E
      ? never
      : IsAny<T> extends true
        ? _Path<T, P>
        : T extends Builtins
          ? _Path<T, P>
          : T extends Array<infer V>
            ? IsTuple<T> extends true
                ? _FlattenTuple<T, E, P, D>
                : _FlattenArray<V, E, P, D>
            : T extends object
              ? _FlattenObject<T, E, P, D>
              : _Path<T, P>

type _FlattenTuple<T extends any[], E, P extends string[], D extends number, I = TupleItems<T>> = {
    [K in keyof I]: K extends KeyTypes
        ? IsAny<I[K]> extends true
            ? _Path<any, [...P, `${K}`]>
            : _FlattenItem<I[K], E, [...P, `${K}`], D>
        : never
}[keyof I]

type _FlattenArray<T, E, P extends string[], D extends number> =
    IsAny<T> extends true ? _Path<any, [...P, `*.${string}`]> : _FlattenItem<T, E, [...P, "*"], D>

type _FlattenObject<T extends object, E, P extends string[], D extends number> = {
    [K in keyof T]-?: K extends KeyTypes
        ? IsAny<T[K]> extends true
            ? _Path<any, [...P, `${K}`]>
            : _FlattenItem<T[K], E, [...P, `${K}`], D>
        : never
}[keyof T]

type _Path<T, P extends string[]> = P["length"] extends 0 ? never : { [key in Concat<".", P>]: T }

/**
 * @param T - The object witch we want to flatten
 * @param P - The prefix of paths (default: [])
 * @param E - The value excludes (default: Function)
 * @param D - Max depth (default: 10)
 *
 * @example
 * Input type:
 * ```ts
 * interface User {
 *   id: number
 *   name: string
 * }
 *
 * interface Category {
 *   id: number
 *   title: string
 * }
 *
 * interface Article {
 *   id: number
 *   title: string
 *   author: User
 *   categories: Array<Category>
 * }
 * ```
 *
 * Result type:
 * type FK = FlattenKeys<Article> =
 *   | "id"
 *   | "title"
 *   | "author.id"
 *   | "author.name"
 *   | "categories.*.id"
 *   | "categories.*.title"
 */
export type FlattenKeys<
    T,
    P extends string[] = [],
    E = FlattenExclude,
    D extends number = MaxRecursion
> = keyof Flatten<T, P, E, D>

// ! TEST ONLY
// enum CategoryState {
//     Pending = "pending",
//     Approved = "approved"
// }

// const enum ProductType {
//     Normal = "normal",
//     Virtual = "virtual"
// }

// interface UserName {
//     first: string
//     last: string
//     title?: string
// }

// interface User {
//     id: number
//     name: UserName
//     age: number
//     state: "ACTIVE" | "INACTIVE"
//     is_active: boolean
//     created_time: Date
// }

// interface Category {
//     id: number
//     name: string
//     state: CategoryState
//     author: User
//     parent: Category
// }

// interface Product {
//     id: number
//     name: string
//     type: ProductType
//     categories: Array<Category>
//     [Symbol.iterator](): IteratorResult<any>
// }

// class Alma {
//     id!: number
//     author!: User
//     xyz: any

//     doSomething(): void {}
// }

// // TODO: ...
// type Poly = { type: "user"; name: string; age: number } | { type: "product"; name: string; sku: string }

// const flattened: Flatten<Product> = { name: 10, dsfsfd: "OK" }
// const almax: Flatten<Alma, ["root"]> = {}
// const almaxc: Flatten<Alma> = {}
// const flattened2: Flatten<Array<[User, Alma]>> = { "*.1.author.age": 10 }
// const flattened2b: Flatten<[User, Alma]> = { "1.author.age": 10 }
// const flattened3: Flatten<{ [key: string | number]: any }> = { dsfsdf: 10 }
// const TE: TupleEntries<[1, "ok", false]> = null
// const anyArray: Flatten<Array<any>> = { "*.alma": 10 }
// const anyArray2: Flatten<{ alma: any[] }> = { "alma.*.ok.x.y": 10 }
// const cat: Flatten<Category> = { "parent.parent.parent.parent.author.id": 10 }
// const dt: Flatten<[Date, string]> = { 0: new Date(), 1: "alma" }

// const ro_cat: DeepReadonly<Flatten<Category>> = {}
// ro_cat["author.age"] = 10

// const ro_obj: DeepReadonly<Flatten<{ [key: string]: any }>> = {}
// ro_obj["alma"]

// type X<T, F = Flatten<T>> = { [K in keyof F]: { ok: F[K] } }

// const ro_obj3: DeepReadonly<X<{ [key: string]: any }>> = {}

// type Obj = { [key: string]: any }

// export type Filter<T extends Obj> = _FilterLite<Flatten<T>>

// type _FilterLite<F extends { [key: string]: any }> = { [K in keyof F]: boolean }

// const xxx: Filter<Obj> = { 10: true }
// const xxx_r: DeepReadonly<Filter<Obj>> = { alma: true }
