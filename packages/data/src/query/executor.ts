import { isEqual } from "lodash-es"
import { Primitive } from "utility-types"

import { DeepReadonly, toSorted } from "@ngutil/common"

import { Model } from "../model"
import { Filter, filterBy } from "./filter"
import { groupBy } from "./grouper"
import { QueryResult, QueryWithSlice } from "./query"
import { Slice } from "./slice"
import { sortBy, Sorter } from "./sorter"

const INPUT = Symbol("INPUT")

interface PartialExecutor {
    [INPUT]: any
}

export interface QueryExecutors<T extends Model> {
    readonly filterFn?: FilterExecutor<T>
    readonly sorterFn?: SorterExecutor<T>
    readonly grouperFn?: GrouperExecutor<T>
    readonly slicerFn?: SliceExecutor<T>
}

export interface QueryExecutor<T extends Model> extends QueryExecutors<T> {
    (items: readonly T[]): QueryResult<T>
}

export function queryExecutor<T extends Model>(
    query: QueryWithSlice<T>,
    previous?: QueryExecutor<T>
): QueryExecutor<T> {
    const executors: QueryExecutors<T> = {
        filterFn: filterExecutor(query.filter, previous?.filterFn),
        sorterFn: sorterExecutor(query.sorter, previous?.sorterFn),
        grouperFn: grouperExecutor(query.grouper, previous?.grouperFn),
        slicerFn: sliceExecutor(query.slice, previous?.slicerFn)
    }

    const changed = previous == null || Object.entries(executors).some(([k, v]) => (previous as any)[k] !== v)
    if (!changed) {
        return previous
    }

    const executor = (items: readonly T[]): QueryResult<T> => {
        if (items == null || items.length === 0) {
            return { items: [], total: 0 }
        }

        let result: readonly T[] = items

        if (executors.filterFn) {
            result = result.filter(executors.filterFn)
        }

        if (executors.sorterFn) {
            result = toSorted(result, executors.sorterFn)
        }

        const total = result.length

        // TODO: grouper

        if (executors.slicerFn) {
            result = executors.slicerFn(result)
        }

        return { items: result, total }
    }

    for (const [k, v] of Object.entries(executors)) {
        Object.defineProperty(executor, k, {
            value: v,
            enumerable: true,
            writable: false
        })
    }

    return executor
}

interface FilterExecutor<T extends Model> extends PartialExecutor {
    (item: T): boolean
}

function filterExecutor<T extends Model>(
    filter?: DeepReadonly<Filter<T>>,
    prev?: FilterExecutor<T>
): FilterExecutor<T> | undefined {
    return compileExec<T>(filter, prev, filterBy)
}

interface SorterExecutor<T extends Model> extends PartialExecutor {
    (a: T, b: T): number
}

function sorterExecutor<T extends Model>(
    sorter?: DeepReadonly<Sorter<T>>,
    prev?: SorterExecutor<T>
): SorterExecutor<T> | undefined {
    return compileExec<T>(sorter, prev, sortBy)
}

interface GrouperExecutor<T extends Model> extends PartialExecutor {
    (item: T): Primitive
}

function grouperExecutor<T extends Model>(
    sorter?: DeepReadonly<Sorter<T>>,
    prev?: GrouperExecutor<T>
): GrouperExecutor<T> | undefined {
    return compileExec<T>(sorter, prev, groupBy)
}

interface SliceExecutor<T extends Model> extends PartialExecutor {
    (items: readonly T[]): T[]
}

function sliceExecutor<T extends Model>(
    slice?: DeepReadonly<Slice>,
    prev?: SliceExecutor<T>
): SliceExecutor<T> | undefined {
    return compileExec<T>(slice, prev, sliceBy)
}

function sliceBy<T extends Model>(slice: Slice) {
    return (items: T[]) => items.slice(slice.start, slice.end)
}

function compileExec<T extends Model>(input: any, prev: any, compiler: any): any {
    if (input == null) {
        return undefined
    }

    if (prev != null) {
        // thorically input is readonly
        if (prev[INPUT] === input || isEqual(prev[INPUT], input)) {
            return prev
        }
    }

    const exec = compiler(input) as any
    Object.defineProperty(exec, INPUT, {
        value: input,
        enumerable: true,
        writable: false
    })
    return exec
}
