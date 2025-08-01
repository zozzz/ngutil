import { Flatten, Primitive } from "@ngutil/common"

import { Model } from "../model"
import { QueryProperty, QueryPropertySet } from "./query-property"

export type GrouperFn<T = any> = (item: any) => Primitive

export type Grouper<T extends Model, F = Flatten<T>> = any
export type GrouperNormalized = any

export function groupBy<T extends Model, F = Flatten<T>>(grouper: Grouper<T, F>): GrouperFn<T> {
    return grouperCompile<T, F>(grouper)
}

function grouperCompile<T extends Model, F = Flatten<T>>(grouper: Grouper<T, F>): GrouperFn<T> {
    return _ => undefined
}

export function grouperMerge<T extends Model, F = Flatten<T>>(
    ...groupers: Array<Grouper<T, F> | undefined | null>
): Grouper<T, F> | undefined {
    return undefined
}

export function grouperNormalize<T extends Model>(grouper: Grouper<T>): GrouperNormalized {}

// import { Primitive } from "utility-types"

// import { Eval, Flatten } from "@ngutil/common"

// import { type Model } from "./query"
// import { SorterFn } from "./sorter"

// export interface Grouped<T extends Model> {
//     items: T[]
//     groups: Group<T>
// }

// export type GrouperFn<T extends Model> = (items: T[]) => any

// export type GroupKey<T extends Model> = (item: T, index: number) => Primitive[]

// export type GroupItemIsMatch<T extends Model> = (item: T, index: number) => boolean

// export interface GrouperX<T extends Model> {
//     name: string
//     title?: string
//     isMatch?: GroupKey<T>
//     [key: string]: any
// }

// export interface GrouperXNormalized<T extends Model> extends GrouperX<T> {
//     key: GroupKey<T>
// }

// type _Groupers<T extends Model, F> = keyof F | Grouper<T>
// export type Grouper<T extends Model, F = Flatten<T>> = Eval<Array<_Groupers<T, F>>>

// export type GrouperNormalized<T extends Model> = { [key: string]: GrouperXNormalized<T> }

// export interface Group<T extends Model, G extends Grouper<T> = Grouper<T>> {
//     grouper: G
//     begin: number
//     end: number
// }

// /**
//  * @example
//  * ```ts
//  * const grouped = groupBy(["status"])(items)
//  * // expexted: {[status]: [...items]}
//  *
//  * const grouped = groupBy(["name", "age"])(items)
//  * // expected {[status]: {[age]: [...items]}}
//  *
//  * const STATUS_LABELS = {active: "Active", inactive: "Inactive"}
//  * const grouped = groupBy([(item) => (STATUS_LABELS[item.status] || "Undefined")])(items)
//  * // expected {["Active" | "Inactive" | "Undefined"]: [...items]}
//  *
//  * const grouped = groupBy([(item) => (STATUS_LABELS[item.status] || "Undefined"), "age"])(items)
//  * // expected {["Active" | "Inactive" | "Undefined"]: {[age]: [...items]}}
//  * ```
//  */
// export function groupBy<T extends Model>(groupers: Grouper<T>): SorterFn<T> {
//     return (_a, _b) => 0
// }

// export function grouperNormalize() {}

// export function grouperCompile<T extends Model>(groupers: Grouper<T>): GrouperFn<T> {
//     return _ => undefined
// }

// export function grouperMerge<T extends Model, F = Flatten<T>>(
//     ...groupers: Array<Grouper<T, F> | undefined | null>
// ): Grouper<T, F> | undefined {
//     return undefined
// }

export class GrouperProperty<T extends Model> extends QueryProperty<Grouper<T>, GrouperNormalized> {
    protected override norm(a: any) {
        return this.provider.grouperNormalize(a)
    }

    protected override merge(a?: any, b?: any) {
        return this.provider.grouperMerge(a, b)
    }
}

export class GrouperPropertySet<T extends Model> extends QueryPropertySet<Grouper<T>> {
    protected override newProperty() {
        return new GrouperProperty(this.provider)
    }

    protected override merge(...args: any[]) {
        return this.provider.grouperMerge(...args)
    }
}
