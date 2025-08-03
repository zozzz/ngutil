import { flattenDeep, intersection, isEqual } from "es-toolkit"

import { AsPrimitive, type DeepReadonly, isFalsy, isPlainObject, isTruthy, MaxRecursion } from "@ngutil/common"

import { Model } from "../model"
import { PathGetter, pathGetterCompile } from "./path"
import { QueryProperty, QueryPropertySet } from "./query-property"

export enum FilterOp {
    Eq = "==",
    EqStrict = "===",
    EqInsesitive = "==*",
    Neq = "!=",
    NeqStrict = "!==",
    NeqInsesitive = "!=*",
    Gt = ">",
    GtInsesitive = ">*",
    Gte = ">=",
    GteInsesitive = ">=*",
    Lt = "<",
    LtInsesitive = "<*",
    Lte = "<=",
    LteInsesitive = "<=*",
    Contains = "%",
    ContainsInsesitive = "%*",
    StartsWith = "^",
    StartsWithInsesitive = "^*",
    EndsWith = "$",
    EndsWithInsesitive = "$*",
    Similarity = "**",
    Regexp = "~",
    RegexpInsesitive = "~*",
    Or = "|",
    And = "&",
    Not = "!"
}

export const OPERATORS: Array<string> = [
    FilterOp.Eq,
    FilterOp.EqStrict,
    FilterOp.EqInsesitive,
    FilterOp.Neq,
    FilterOp.NeqStrict,
    FilterOp.NeqInsesitive,
    FilterOp.Gt,
    FilterOp.GtInsesitive,
    FilterOp.Gte,
    FilterOp.GteInsesitive,
    FilterOp.Lt,
    FilterOp.LtInsesitive,
    FilterOp.Lte,
    FilterOp.LteInsesitive,
    FilterOp.Contains,
    FilterOp.ContainsInsesitive,
    FilterOp.StartsWith,
    FilterOp.StartsWithInsesitive,
    FilterOp.EndsWith,
    FilterOp.EndsWithInsesitive,
    FilterOp.Similarity,
    FilterOp.Regexp,
    FilterOp.RegexpInsesitive,
    FilterOp.Or,
    FilterOp.And,
    FilterOp.Not
]

export type FilterCustom<T = any> = { custom: string; matcher?: FilterCustomMatcher<T> }

export type FilterCustomMatcher<T = any> = (item: T | null | undefined, value: any) => boolean

export type FilterOpMap = Record<string, FilterOp | FilterCustom>

export function asOperators(value: any): Array<{ op: FilterOp; value: any }> {
    const ops = intersection(Object.keys(value), OPERATORS) as FilterOp[]
    if (ops.length > 0) {
        return ops.map(op => {
            return { op, value: value[op] }
        })
    } else {
        return [{ op: FilterOp.Eq, value }]
    }
}

// export type Filter<T extends Model> = _Filter<Flatten<T>, [], MaxRecursion>
// TODO: fix recursion
export type Filter<T extends Model> = { [key: string]: any }

type _Filter<F, P extends number[], D extends number> = P["length"] extends D ? never : _ObjectFilter<F, P, D>

type _ObjectFilter<F, P extends number[], D extends number> = P["length"] extends D
    ? never
    : { [K in keyof F]?: Operators<F[K], P, D> }

type RootOr<F, P extends number[], D extends number> = P["length"] extends D
    ? never
    : { [FilterOp.Or]: Array<_Filter<F, [...P, 0], D>> | undefined }

type RootAnd<F, P extends number[], D extends number> = P["length"] extends D
    ? never
    : { [FilterOp.And]: Array<_Filter<F, [...P, 0], D>> | undefined }

export type Operators<T, P extends number[], D extends number = MaxRecursion> = P["length"] extends D
    ? never
    : SimpleOperators<T>

type LocalOr<T, P extends number[], D extends number> = P["length"] extends D
    ? never
    : { [FilterOp.Or]: Array<Operators<T, [...P, 0], D>> | undefined }

type LocalAnd<T, P extends number[], D extends number> = P["length"] extends D
    ? never
    : { [FilterOp.And]: Array<Operators<T, [...P, 0], D>> | undefined }

type SimpleOperators<T> =
    | EqStrict<T>
    | NeqStrict<T>
    | Eq<T>
    | Neq<T>
    | Gt<T>
    | Gte<T>
    | Lt<T>
    | Lte<T>
    | Contains<T>
    | StartsWith<T>
    | Similarity<T>
    | EndsWith<T>
    | Regexp<T>
    | T
    | undefined
    | null

type EqStrict<T> = Operator<T, T, FilterOp.EqStrict, never, null>
type NeqStrict<T> = Operator<T, T, FilterOp.NeqStrict, never, null>
type Eq<T> = Operator<T, T | AsPrimitive<T>, FilterOp.Eq, FilterOp.EqInsesitive, null>
type Neq<T> = Operator<T, T | AsPrimitive<T>, FilterOp.Neq, FilterOp.NeqInsesitive, null>
type Gt<T> = Operator<T, T | AsPrimitive<T>, FilterOp.Gt, FilterOp.GtInsesitive>
type Gte<T> = Operator<T, T | AsPrimitive<T>, FilterOp.Gte, FilterOp.GteInsesitive>
type Lt<T> = Operator<T, T | AsPrimitive<T>, FilterOp.Lt, FilterOp.LtInsesitive>
type Lte<T> = Operator<T, T | AsPrimitive<T>, FilterOp.Lte, FilterOp.LteInsesitive>
type Contains<T> = Operator<T, string, FilterOp.Contains, FilterOp.ContainsInsesitive>
type StartsWith<T> = Operator<T, string, FilterOp.StartsWith, FilterOp.StartsWithInsesitive>
type Similarity<T> = Operator<T, string, FilterOp.Similarity, never, null>
type EndsWith<T> = Operator<T, string, FilterOp.EndsWith, FilterOp.EndsWithInsesitive>
type Regexp<T> = Operator<T, string, FilterOp.Regexp, FilterOp.RegexpInsesitive, RegExp>

type Operator<T, R, OP extends string, OPI extends string = never, ET = never> =
    | (T extends R ? { [k in OP]: T | ET | R } : never)
    | (T extends string ? (OPI extends never ? never : { [k in OPI]: string }) : never)

export type FilterFn<T = any> = (item: T) => boolean

/**
 * @example
 * ```ts
 * items.filter(filterBy({id: 42}))
 * ```
 */
export function filterBy<T extends Model>(filters: Filter<T>, opmap?: FilterOpMap): FilterFn<T> {
    return _filterCompile<T>(filters, opmap)
}

type NormPath = { path: string; op: Exclude<FilterOp, FilterOp.Or | FilterOp.And | FilterOp.Not>; value: any }
type NormOr = { op: FilterOp.Or; value: Array<NormEntry> }
type NormAnd = { op: FilterOp.And; value: Array<NormEntry> }
type NormNot = { op: FilterOp.Not; value: Array<NormEntry> }
type NormCustom = { path: string; op: FilterCustom; value: any }
type NormEmpty = Record<string, never>
type NormEntry = NormPath | NormOr | NormAnd | NormNot | NormCustom | NormEmpty
export type FilterNormalized = NormEntry

/**
 * @example
 * ```ts
 * filterNormalize({id: {">": 0, "<": 10}})
 * {op: "&", value: [{path: "id", op: ">", value: 0}, {path: "id", op: "<", value: 10}]}
 * ```
 */
export function filterNormalize<T extends Model>(
    filters: Filter<T> | null | undefined,
    opmap?: FilterOpMap
): FilterNormalized | undefined {
    return _normalizeFilter(filters, undefined, opmap)
}

export function filterIsNormnalized(filters: any): filters is FilterNormalized {
    if (isPlainObject(filters) && "op" in filters && OPERATORS.includes(filters["op"])) {
        if (filters["op"] === FilterOp.Or || filters["op"] === FilterOp.And || filters["op"] === FilterOp.Not) {
            return Array.isArray(filters["value"])
        }
        return typeof filters["path"] === "string" && "value" in filters
    }
    return false
}

function _normalizeFilter<T extends Model>(
    filters: Filter<T> | null | undefined,
    parent?: string,
    opmap?: FilterOpMap
): FilterNormalized | undefined {
    if (filters == null) {
        return undefined
    }

    if (filterIsNormnalized(filters)) {
        return filters
    }

    if ("op" in filters && "value" in filters) {
        if (filters["op"] === FilterOp.Or || filters["op"] === FilterOp.And || filters["op"] === FilterOp.Not) {
            return { op: filters["op"], value: filters["value"].map((v: any) => _normalizeFilter(v, parent, opmap)) }
        }
        if ("path" in filters) {
            return filters as FilterNormalized
        }
    }

    const norm = flattenDeep(
        Object.entries(filters).map(([path, value]) => {
            const op = _remapOp(path, opmap)
            switch (op) {
                case FilterOp.And:
                case FilterOp.Or:
                case FilterOp.Not:
                    if (!Array.isArray(value)) {
                        throw new Error(`Operator (${op}) must have array type`)
                    }
                    return {
                        op: op,
                        value: value
                            .map(v => {
                                if (isPlainObject(v)) {
                                    return _normalizeFilter(v, parent, opmap)
                                } else {
                                    return parent ? { path: parent, op: FilterOp.EqStrict, value: v } : undefined
                                }
                            })
                            .filter(v => v != null)
                    }

                default:
                    if (isPlainObject(value)) {
                        return _normalizeFilter(value, parent ? `${parent}.${path}` : path, opmap)
                    }
                    if (parent != null) {
                        if (op == null) {
                            return { path: `${parent}.${path}`, op: FilterOp.EqStrict, value }
                        } else {
                            return { path: parent, op: op, value }
                        }
                    } else {
                        return { path, op: FilterOp.EqStrict, value }
                    }
            }
        })
    )

    if (norm.length === 0) {
        return {}
    } else if (norm.length === 1) {
        return norm[0] as FilterNormalized
    } else {
        return { op: FilterOp.And, value: norm } as FilterNormalized
    }
}

function _remapOp(op: string, opmap?: FilterOpMap) {
    const mapped = opmap == null ? op : opmap[op] ?? op
    if (typeof mapped === "string" && OPERATORS.includes(mapped)) {
        return mapped
    } else if (isPlainObject(mapped) && "custom" in mapped) {
        return mapped
    }
    return null
}

type GetPathFn = (pth: string) => ReturnType<typeof pathGetterCompile>

function _filterCompile<T extends Model>(filters: Filter<T>, opmap?: FilterOpMap): FilterFn<T> {
    const normalized = filterNormalize(filters, opmap)
    if (normalized == null) {
        return alwaysTrue
    }
    return _filterCompileNorm(normalized, pathGetterCompile)
}

function alwaysTrue() {
    return true
}

function _filterCompileNorm(filter: FilterNormalized, getPath: GetPathFn): FilterFn<any> {
    switch (filter.op) {
        case FilterOp.And:
            return and_(filter.value.map(v => _filterCompileNorm(v, getPath)))

        case FilterOp.Or:
            return or_(filter.value.map(v => _filterCompileNorm(v, getPath)))

        case FilterOp.Not:
            return not_(filter.value.map(v => _filterCompileNorm(v, getPath)))

        default:
            return _filterComplileNormPath(getPath(filter.path), filter.op, filter.value, getPath)
    }
}

function _filterComplileNormPath(
    getter: PathGetter,
    op: FilterOp | FilterCustom,
    value: any,
    getPath: GetPathFn
): FilterFn<any> {
    let lower: string
    let regex: RegExp

    switch (op) {
        case FilterOp.And:
            return and_((value as NormEntry[]).map(v => _filterCompileNorm(v, getPath)))

        case FilterOp.Or:
            return or_((value as NormEntry[]).map(v => _filterCompileNorm(v, getPath)))

        case FilterOp.Not:
            return not_((value as NormEntry[]).map(v => _filterCompileNorm(v, getPath)))

        case FilterOp.Eq:
            // eslint-disable-next-line eqeqeq
            return matcher(getter, v => v == value)

        case FilterOp.EqStrict:
            return matcher(getter, v => v === value)

        case FilterOp.EqInsesitive:
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase() === lower)

        case FilterOp.Neq:
            // eslint-disable-next-line eqeqeq
            return matcher(getter, v => v != value)

        case FilterOp.NeqStrict:
            return matcher(getter, v => v !== value)

        case FilterOp.NeqInsesitive:
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase() !== lower)

        case FilterOp.Gt:
            return matcher(getter, v => v > value)

        case FilterOp.GtInsesitive:
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase() > lower)

        case FilterOp.Gte:
            return matcher(getter, v => v >= value)

        case FilterOp.GteInsesitive:
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase() >= lower)

        case FilterOp.Lt:
            return matcher(getter, v => v < value)

        case FilterOp.LtInsesitive:
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase() < lower)

        case FilterOp.Lte:
            return matcher(getter, v => v <= value)

        case FilterOp.LteInsesitive:
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase() <= lower)

        case FilterOp.Contains:
            lower = String(value)
            return matcher(getter, v => (Array.isArray(v) ? v.includes(value) : String(v).includes(lower)))

        case FilterOp.ContainsInsesitive:
        case FilterOp.Similarity:
            // TODO: proper similarity test
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase().includes(lower))

        case FilterOp.StartsWith:
            lower = String(value)
            return matcher(getter, v => String(v).startsWith(lower))

        case FilterOp.StartsWithInsesitive:
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase().startsWith(lower))

        case FilterOp.EndsWith:
            lower = String(value)
            return matcher(getter, v => String(v).endsWith(lower))

        case FilterOp.EndsWithInsesitive:
            lower = String(value).toLocaleLowerCase()
            return matcher(getter, v => String(v).toLocaleLowerCase().endsWith(lower))

        case FilterOp.Regexp:
            regex = value instanceof RegExp ? value : new RegExp(value, "msv")
            return matcher(getter, v => regex.test(v))

        case FilterOp.RegexpInsesitive:
            regex = value instanceof RegExp ? value : new RegExp(value, "msvi")
            return matcher(getter, v => regex.test(v))

        default:
            if (isPlainObject(op) && op.matcher) {
                return matcher(getter, v => op.matcher!(v, value))
            }
    }

    throw new Error(`Unexpected operator: ${op}`)
}

function matcher(getter: PathGetter, predict: (value: any) => boolean): FilterFn {
    return obj => getter(obj).some(predict)
}

function and_(fns: FilterFn[]): FilterFn {
    if (fns.length === 0) {
        return alwaysTrue
    }

    if (fns.length === 1) {
        return fns[0]
    }

    return item => {
        for (const fn of fns) {
            if (!fn(item)) {
                return false
            }
        }
        return true
    }
}

function or_(fns: FilterFn[]): FilterFn {
    if (fns.length === 0) {
        return alwaysTrue
    }

    if (fns.length === 1) {
        return fns[0]
    }

    return item => {
        for (const fn of fns) {
            if (fn(item)) {
                return true
            }
        }
        return false
    }
}

function not_(fns: FilterFn[]): FilterFn {
    if (fns.length === 0) {
        return alwaysTrue
    }

    return item => !and_(fns)(item)
}

export function filterMerge(...filters: Array<FilterNormalized | null | undefined>): any | undefined {
    filters.reverse()
    const lastReset = filters.findIndex(v => v == null)
    filters.reverse()

    if (lastReset !== -1) {
        const index = filters.length - lastReset
        filters = filters.slice(index)
    }

    const value = filters
        .filter(v => v != null)
        .filter(v => (Array.isArray(v) && v.length > 0) || (isPlainObject(v) && Object.keys(v).length > 0))

    if (value.length === 0) {
        return undefined
    }

    return compact({ op: FilterOp.And, value })
}

export class FilterProperty<T extends Model> extends QueryProperty<Filter<T>, FilterNormalized> {
    protected override merge(
        a?: FilterNormalized | undefined,
        b?: FilterNormalized | undefined
    ): FilterNormalized | undefined {
        return this.provider.filterMerge(a, b)
    }
    protected override norm(a: FilterNormalized | Filter<T>): FilterNormalized | undefined {
        return this.provider.filterNormalize(a)
    }
}

export class FilterPropertySet<T extends Model> extends QueryPropertySet<Filter<T>> {
    protected override newProperty() {
        return new FilterProperty(this.provider)
    }

    protected override merge(...args: any[]) {
        return this.provider.filterMerge(...args)
    }
}

export function filterSimplify(filters: any): object | null {
    if (isTruthy(filters)) {
        filters = compact(filterNormalize(filters)!)
        const result: { [key: string]: any } = {}
        if (filters["op"] === FilterOp.And) {
            filters = filters["value"]
            if (filters == null) {
                return result
            }
        }
        if (!Array.isArray(filters)) {
            filters = [filters]
        }

        for (const f of filters) {
            if (
                f["value"] != null &&
                (f["op"] === FilterOp.Eq || f["op"] === FilterOp.EqStrict || f["op"] === FilterOp.EqInsesitive)
            ) {
                result[f["path"] as string] = f["value"]
            }
        }
        return result
    } else {
        return null
    }
}

function compact(filters: DeepReadonly<FilterNormalized>): FilterNormalized | undefined {
    if (filters.op === FilterOp.And || filters.op === FilterOp.Or || filters.op === FilterOp.Not) {
        if (isFalsy(filters.value)) {
            return undefined
        }

        let value = filters.value.map(compact).filter(isTruthy)
        if (value.length === 0) {
            return undefined
        }

        // remove subfilters with the same operator
        value = value.reduce<NormEntry[]>((acc, value) => {
            if (value.op === filters.op) {
                return acc.concat(value.value)
            } else {
                acc.push(value)
                return acc
            }
        }, [])

        // deduplicate by path && op
        value = value
            .reverse()
            .filter((v, i, a) => a.findIndex(v2 => (v as any).path === (v2 as any).path && isEqual(v.op, v2.op)) === i)
            // remove undefined values, keep null
            .filter(v => "value" in v && v.value !== undefined)
            .reverse()

        if (value.length === 0) {
            return undefined
        }

        if (value.length === 1 && (filters.op === FilterOp.And || filters.op === FilterOp.Or)) {
            return value[0]
        }

        return { op: filters.op, value }
    }

    return filters ?? undefined
}
