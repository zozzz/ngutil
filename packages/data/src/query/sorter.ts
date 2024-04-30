import { map, Observable } from "rxjs"

import { flattenDeep, isEqual } from "lodash"

import { deepClone, isPlainObject } from "@ngutil/common"

import { Model } from "../model"
import { pathGetterCompile } from "./path"
import { QueryProperty, QueryPropertySet } from "./query-property"

export type SorterFn<T = any> = (a: T, b: T) => number

export const enum SortDirection {
    Asc = "asc",
    Desc = "desc"
}

export type SortDir = SortDirection.Asc | SortDirection.Desc | "asc" | "desc"
export type SortDirExtra = { dir: SortDir; emptyFirst: boolean }

type _Sorter<F> = { [K in keyof F]: { [key in K]: SortDir | SortDirExtra } }[keyof F]
// TODO: fix recursion
// export type Sorter<T extends Model> = Array<_Sorter<Flatten<T>>>
export type Sorter<T extends Model> = Array<{ [key: string]: SortDir | SortDirExtra | undefined }>

type NormalizedEntry = { path: string; isAsc: boolean; emptyFirst: boolean }
export type SorterNormalized = Array<NormalizedEntry>

/**
 * @example
 *```ts
 * items.toSorted(sortBy([{"author.name": "asc"}]))
 * ```
 */
export function sortBy<T extends Model>(sorters: Sorter<T>): SorterFn<T> {
    if (sorters.length === 0) {
        throw new Error("Empty sorter")
    }
    return _sorterCompile<T>(sorters) as any
}

/**
 * Normalize sorter definition
 *
 * @example
 * ```ts
 * normalizeSorter([{id: "asc"}]) -> [{path: "id", isAsc: true, emptyFirst: true}]
 * normalizeSorter([{id: {dir: "desc", emptyFirst: false}}]) -> [{path: "id", isAsc: false, emptyFirst: false}]
 * ```
 */
export function sorterNormalize<T extends Model>(sorters: Sorter<T>): SorterNormalized {
    return flattenDeep(
        (sorters as any).map((s: any) =>
            Object.entries(s).map(([k, v]) => {
                if (typeof v === "string") {
                    const isAsc = v.toLowerCase() === "asc"
                    return { path: k, isAsc, emptyFirst: isAsc ? false : true }
                } else if (isPlainObject(v)) {
                    return {
                        path: k,
                        isAsc: ((v as SortDirExtra).dir || "asc").toLowerCase() === "asc",
                        emptyFirst: (v as SortDirExtra).emptyFirst == null ? true : !!(v as SortDirExtra).emptyFirst
                    }
                } else {
                    throw new Error(`Invalid sorter: ${v}`)
                }
            })
        )
    )
}

function _sorterCompile<T extends Model>(sorters: Sorter<T>): SorterFn<T> {
    if (sorters.length === 0) {
        return (_a, _b) => 0
    }

    const norm = sorterNormalize<T>(sorters).map(createComparator)
    if (norm.length === 1) {
        return norm[0]
    }

    const initial = norm.pop()!
    return norm.reduceRight<SorterFn<T>>(
        (next, curr) => (a, b) => {
            const r = curr(a, b)
            return r === 0 ? next(a, b) : r
        },
        initial
    )
}

function createComparator({ path, isAsc, emptyFirst }: NormalizedEntry): SorterFn {
    const getter = pathGetterCompile(path)
    if (isAsc) {
        return (a, b) => compare(getter(a), getter(b), emptyFirst)
    } else {
        return (a, b) => compare(getter(a), getter(b), !emptyFirst) * -1
    }
}

export function compare(a: any, b: any, emptyFirst: boolean): number {
    // console.log("COMPARE", a, b)
    if (a == null && b != null) {
        return emptyFirst === true ? -1 : 1
    } else if (a != null && b == null) {
        return emptyFirst === true ? 1 : -1
    } else if (a == null && b == null) {
        return 0
    } else if (isEqual(a, b)) {
        return 0
    } else if (typeof a === "number" && typeof b === "number") {
        return a - b
    } else if (typeof a === "string" && typeof b === "string") {
        const al = a.length
        const bl = b.length
        // if both lengths is 0 the code execution not reach that point, because a === b
        if (emptyFirst === true) {
            if (al === 0) {
                return -1
            } else if (bl === 0) {
                return 1
            }
        } else {
            if (al === 0) {
                return 1
            } else if (bl === 0) {
                return -1
            }
        }
        return a.localeCompare(b)
    } else if (Array.isArray(a) && Array.isArray(b)) {
        const al = a.length
        const bl = b.length
        const l = Math.min(al, bl)

        for (let i = 0; i < l; i++) {
            const res = compare(a[i], b[i], emptyFirst)
            if (res !== 0) {
                return res
            }
        }

        if (al === bl) {
            return 0
        }

        if (emptyFirst === true) {
            if (al === 0) {
                return -1
            } else if (bl === 0) {
                return 1
            }
        } else {
            if (al === 0) {
                return 1
            } else if (bl === 0) {
                return -1
            }
        }

        return al - bl
    } else if (isPlainObject(a) && isPlainObject(b)) {
        return JSON.stringify(a).localeCompare(JSON.stringify(b))
    }

    return a > b ? -1 : 1
}

export function sorterMerge<T extends Model>(...sorters: any[]): any | undefined {
    let result: Sorter<T> | undefined

    for (const sorter of sorters) {
        if (sorter == null) {
            continue
        }
        if (result == null) {
            result = deepClone(sorter)
            continue
        }

        for (const sentry of sorter) {
            for (const [k, v] of Object.entries(sentry)) {
                const existing = (result as any).find((value: any) => value[k] != null)
                if (existing) {
                    if (v == null) {
                        delete (existing as any)[k]
                        if (Object.keys(existing).length === 0) {
                            result.splice(result.indexOf(existing), 1)
                        }
                    } else {
                        ;(existing as any)[k] = deepClone(v)
                    }
                } else if (v != null) {
                    result.push({ [k]: deepClone(v) } as any)
                }
            }
        }
    }

    if (result?.length === 0) {
        return undefined
    }

    return result
}

export function sorterFind<T extends Model>(sorters: Sorter<T>, name: string): SortDir | SortDirExtra | undefined {
    const sorter = sorters.find(v => v[name] != null)
    if (sorter != null) {
        return sorter[name]
    }
    return undefined
}

type OfTypes<T extends Model> = ReturnType<typeof sorterFind<T>>

export class SorterProperty<T extends Model> extends QueryProperty<Sorter<T>> {
    protected override merge(a?: Sorter<T> | undefined, b?: Sorter<T> | undefined): Sorter<T> | undefined {
        return sorterMerge(a, b)
    }
}

export class SorterPropertySet<T extends Model> extends QueryPropertySet<Sorter<T>> {
    #of(name: string): Observable<OfTypes<T>> {
        return this.pipe(map((sorters: any) => (sorters == null ? undefined : sorterFind(sorters, name))))
    }

    directionOf(name: string) {
        return this.#of(name).pipe(
            map(value => {
                if (value == null) {
                    return undefined
                } else if (typeof value === "string") {
                    return value
                } else {
                    return value.dir
                }
            })
        )
    }

    isAsc(name: string): Observable<boolean> {
        return this.directionOf(name).pipe(map(v => v === SortDirection.Asc))
    }

    isDesc(name: string): Observable<boolean> {
        return this.directionOf(name).pipe(map(v => v === SortDirection.Desc))
    }

    protected override newProperty(): QueryProperty<Sorter<T>> {
        return new SorterProperty(undefined)
    }
    protected override merge(...args: any[]) {
        return sorterMerge(...args)
    }
}
