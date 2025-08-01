import { combineLatest, Observable, shareReplay } from "rxjs"

import { type DeepReadonly } from "@ngutil/common"

import { type Model } from "../model"
import type { DataProvider } from "../provider"
import { readonlyProp } from "./common"
import { type FilterNormalized, FilterProperty, FilterPropertySet } from "./filter"
import { type GrouperNormalized, GrouperProperty, GrouperPropertySet } from "./grouper"
import { type QueryPropertySetOf } from "./query-property"
import { type Slice } from "./slice"
import { type SlimerNormalized, SlimerProperty, SlimerPropertySet } from "./slimer"
import { type SorterNormalized, SorterProperty, SorterPropertySet } from "./sorter"

export interface Query {
    filter?: DeepReadonly<FilterNormalized>
    sorter?: DeepReadonly<SorterNormalized>
    slimer?: DeepReadonly<SlimerNormalized>
    grouper?: DeepReadonly<GrouperNormalized>
}

export interface QueryWithSlice<T extends Model> extends Query {
    slice: DeepReadonly<Slice>
}

export interface QueryResult<T extends Model> {
    items: readonly T[]
    total?: number
    groups?: any[]
}

export interface QuerySubject<T extends Model, N extends string[]> extends Observable<Query> {
    readonly filter: QueryPropertySetOf<FilterPropertySet<T>, FilterProperty<T>, N>
    readonly sorter: QueryPropertySetOf<SorterPropertySet, SorterProperty<T>, N>
    readonly slimer: QueryPropertySetOf<SlimerPropertySet<T>, SlimerProperty<T>, N>
    readonly grouper: QueryPropertySetOf<GrouperPropertySet<T>, GrouperProperty<T>, N>
}

export function querySubject<T extends Model, N extends string[]>(
    provider: DataProvider<T>,
    ...names: N
): QuerySubject<T, N> {
    const filter = new FilterPropertySet(provider, ...names)
    const sorter = new SorterPropertySet(provider, ...names)
    const slimer = new SlimerPropertySet(provider, ...names)
    const grouper = new GrouperPropertySet(provider, ...names)

    const result = combineLatest({ filter, sorter, slimer, grouper }).pipe(shareReplay(1))
    readonlyProp(result, "filter", filter)
    readonlyProp(result, "sorter", sorter)
    readonlyProp(result, "slimer", slimer)
    readonlyProp(result, "grouper", grouper)

    return result as any
}
