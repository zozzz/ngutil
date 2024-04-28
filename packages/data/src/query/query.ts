import { Observable } from "rxjs"

import { type DeepReadonly } from "@ngutil/common"

import { type Model } from "../model"
import { type Filter } from "./filter"
import { type Grouper } from "./grouper"
import type { IQueryCombinedProperty } from "./query-property"
import { type Slice } from "./slice"
import { type Slimer } from "./slimer"
import { type Sorter } from "./sorter"

export interface Query<T extends Model> {
    filter?: DeepReadonly<Filter<T>>
    sorter?: DeepReadonly<Sorter<T>>
    slimer?: DeepReadonly<Slimer<T>>
    grouper?: DeepReadonly<Grouper<T>>
    slice?: DeepReadonly<Slice>
}

export interface QueryResult<T extends Model> {
    items: readonly T[]
    total?: number
    groups?: any[]
}

export interface IQuerySubject<T extends Model> extends Observable<Query<T>> {
    readonly filter: IQueryCombinedProperty<Filter<T>>
    readonly sorter: IQueryCombinedProperty<Sorter<T>>
    readonly slimer: IQueryCombinedProperty<Slimer<T>>
    readonly grouper: IQueryCombinedProperty<Grouper<T>>
    readonly slice: IQueryCombinedProperty<Slice>
}

// export class QuerySubject<T extends Model> extends Observable<Query<T>> implements IQuerySubject<T> {

// }

// export class QuerySubjectProxy<T extends Model> extends Observable<Query<T>> implements IQuerySubject<T> {

// }
