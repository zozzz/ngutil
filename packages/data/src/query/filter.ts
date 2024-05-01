import { flattenDeep, intersection } from "lodash"

import { AsPrimitive, deepClone, isPlainObject, MaxRecursion } from "@ngutil/common"

import { Model } from "../model"
import { PathGetter, pathGetterCompile } from "./path"
import { QueryProperty, QueryPropertySet } from "./query-property"

export const enum FilterOp {
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
    Regexp = "~",
    RegexpInsesitive = "~*",
    Or = "|",
    And = "&"
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
    FilterOp.Regexp,
    FilterOp.RegexpInsesitive,
    FilterOp.Or,
    FilterOp.And
]

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
export function filterBy<T extends Model>(filters: Filter<T>): FilterFn<T> {
    return _filterCompile<T>(filters)
}

// TODO: Normalize filter
// type _Filter = { path: string; op: FilterOp; value: any }
// type _Or = { "|": Array<_Filter> }
// type _And = { "&": Array<_Filter> }
// export type NormalizedFilter = _Or | _And
type NormPath = { path: string; op: Exclude<FilterOp, FilterOp.Or | FilterOp.And>; value: any }
type NormOr = { op: FilterOp.Or; value: Array<NormEntry> }
type NormAnd = { op: FilterOp.And; value: Array<NormEntry> }
type NormEntry = NormPath | NormOr | NormAnd
export type FilterNormalized = NormEntry

/**
 * @example
 * ```ts
 * filterNormalize({id: {">": 0, "<": 10}})
 * {op: "&", value: [{path: "id", op: ">", value: 0}, {path: "id", op: "<", value: 10}]}
 * ```
 */
export function filterNormalize<T extends Model>(filters: Filter<T>): FilterNormalized {
    return _normalizeFilter(filters)
}

function _normalizeFilter<T extends Model>(filters: Filter<T>, parent?: string): any {
    const norm = flattenDeep(
        Object.entries(filters).map(([path, value]) => {
            switch (path) {
                case FilterOp.And:
                    if (!Array.isArray(value)) {
                        throw new Error(`Operator AND (${FilterOp.And}) must have array type`)
                    }
                    return { op: FilterOp.And, value: value.map(v => _normalizeFilter(v, parent)) }

                case FilterOp.Or:
                    if (!Array.isArray(value)) {
                        throw new Error(`Operator OR (${FilterOp.Or}) must have array type`)
                    }
                    return { op: FilterOp.Or, value: value.map(v => _normalizeFilter(v, parent)) }

                // TODO: check all filter, and if not found filter key, taht object maybne not a filter
                default:
                    if (isPlainObject(value)) {
                        return _normalizeFilter(value, path)
                    }
                    if (parent != null) {
                        return { path: parent, op: path, value }
                    } else {
                        return { path, op: FilterOp.EqStrict, value }
                    }
            }
        })
    )

    if (norm.length === 0) {
        return norm
    } else if (norm.length === 1) {
        return norm[0]
    } else {
        return { op: FilterOp.And, value: norm }
    }
}

type GetPathFn = (pth: string) => ReturnType<typeof pathGetterCompile>

function _filterCompile<T extends Model>(filters: Filter<T>): FilterFn<T> {
    const pathCache: { [key: string]: PathGetter } = {}
    const getPath = (pth: string) => {
        if (pathCache[pth] != null) {
            return pathCache[pth]
        }
        return (pathCache[pth] = pathGetterCompile(pth))
    }
    const normalized = filterNormalize(filters)
    return _filterCompileNorm(normalized, getPath)
}

function _filterCompileNorm(filter: FilterNormalized, getPath: GetPathFn): FilterFn<any> {
    switch (filter.op) {
        case FilterOp.And:
            return and_(filter.value.map(v => _filterCompileNorm(v, getPath)))

        case FilterOp.Or:
            return or_(filter.value.map(v => _filterCompileNorm(v, getPath)))

        default:
            return _filterComplileNormPath(getPath(filter.path), filter.op, filter.value, getPath)
    }
}

function _filterComplileNormPath(getter: PathGetter, op: FilterOp, value: any, getPath: GetPathFn): FilterFn<any> {
    let lower: string
    let regex: RegExp
    switch (op) {
        case FilterOp.And:
            return and_((value as NormEntry[]).map(v => _filterCompileNorm(v, getPath)))

        case FilterOp.Or:
            return or_((value as NormEntry[]).map(v => _filterCompileNorm(v, getPath)))

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
    }

    throw new Error(`Unexpected operator: ${op}`)
}

function matcher(getter: PathGetter, predict: (value: any) => boolean): FilterFn {
    return obj => getter(obj).some(predict)
}

function and_(fns: FilterFn[]): FilterFn {
    if (fns.length === 0) {
        return _ => true
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
        return _ => true
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

export function filterMerge(...filters: any[]): any | undefined {
    let result: { [key: string]: any } | undefined = undefined

    for (const filter of filters) {
        if (filter == null) {
            continue
        }
        if (result == null) {
            result = deepClone(filter)
        } else {
            for (const [k, v] of Object.entries(filter)) {
                if (v === undefined) {
                    delete result[k]
                    continue
                }

                result[k] = deepClone(v)
            }
        }
    }

    return result as any
}

export class FilterProperty<T extends Model> extends QueryProperty<Filter<T>, FilterNormalized> {
    protected override merge(
        a?: FilterNormalized | undefined,
        b?: FilterNormalized | undefined
    ): FilterNormalized | undefined {
        return filterMerge(a, b)
    }
    protected override norm(a: FilterNormalized | Filter<T>): FilterNormalized | undefined {
        return filterNormalize(a)
    }
}

export class FilterPropertySet<T extends Model> extends QueryPropertySet<Filter<T>> {
    protected override newProperty() {
        return new FilterProperty(undefined)
    }

    protected override merge(...args: any[]) {
        return filterMerge(...args)
    }
}
