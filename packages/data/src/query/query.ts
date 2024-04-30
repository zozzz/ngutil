import { combineLatest, Observable, shareReplay } from "rxjs"

import { type DeepReadonly } from "@ngutil/common"

import { type Model } from "../model"
import { type Filter, FilterProperty, FilterPropertySet } from "./filter"
import { type Grouper, GrouperProperty, GrouperPropertySet } from "./grouper"
import { type QueryPropertySetOf } from "./query-property"
import { type Slice } from "./slice"
import { type Slimer, SlimerProperty, SlimerPropertySet } from "./slimer"
import { type Sorter, SorterProperty, SorterPropertySet } from "./sorter"
import { readonlyProp } from "./util"

export interface Query<T extends Model> {
    filter?: DeepReadonly<Filter<T>>
    sorter?: DeepReadonly<Sorter<T>>
    slimer?: DeepReadonly<Slimer<T>>
    grouper?: DeepReadonly<Grouper<T>>
}

export interface QueryWithSlice<T extends Model> extends Query<T> {
    slice: DeepReadonly<Slice>
}

export interface QueryResult<T extends Model> {
    items: readonly T[]
    total?: number
    groups?: any[]
}

export interface QuerySubject<T extends Model, N extends string[]> extends Observable<Query<T>> {
    readonly filter: QueryPropertySetOf<FilterPropertySet<T>, FilterProperty<T>, N>
    readonly sorter: QueryPropertySetOf<SorterPropertySet<T>, SorterProperty<T>, N>
    readonly slimer: QueryPropertySetOf<SlimerPropertySet<T>, SlimerProperty<T>, N>
    readonly grouper: QueryPropertySetOf<GrouperPropertySet<T>, GrouperProperty<T>, N>
}

export function querySubject<T extends Model, N extends string[]>(...names: N): QuerySubject<T, N> {
    const filter = new FilterPropertySet(...names)
    const sorter = new SorterPropertySet(...names)
    const slimer = new SlimerPropertySet(...names)
    const grouper = new GrouperPropertySet(...names)

    const result = combineLatest({ filter, sorter, slimer, grouper }).pipe(shareReplay(1))
    readonlyProp(result, "filter", filter)
    readonlyProp(result, "sorter", sorter)
    readonlyProp(result, "slimer", slimer)
    readonlyProp(result, "grouper", grouper)

    return result as any
}
