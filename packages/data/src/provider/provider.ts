import type { Observable } from "rxjs"
import { NEVER, of } from "rxjs"

import type { Model, ModelMeta, ModelRefNorm } from "../model"
import {
    filterMerge,
    filterNormalize,
    type FilterNormalized,
    type Query,
    type QueryResult,
    type QueryWithSlice,
    type Slice,
    sorterMerge,
    sorterNormalize,
    type SorterNormalized
} from "../query"
import { grouperMerge, grouperNormalize, type GrouperNormalized } from "../query/grouper"
import { slimerMerge, slimerNormalize, type SlimerNormalized } from "../query/slimer"
import { DataSource } from "../source"
import type { CollectionStore } from "../store"

export abstract class DataProvider<T extends Model> {
    /**
     * `true` when the provider is making async requests
     */
    abstract readonly isAsync: boolean

    /**
     * Metadata of model
     */
    abstract readonly meta: ModelMeta<T>

    /**
     * Emit event when data is changed
     */
    get changed$(): Observable<any> {
        return this._changed
    }
    protected _changed: Observable<any> = NEVER

    /**
     * Query items by the given request
     */
    abstract queryList(request: QueryWithSlice<T>): Observable<QueryResult<T>>

    /**
     * Query exactly one item by the given request
     */
    abstract queryItem(ref: ModelRefNorm, request: Query): Observable<T | undefined>

    /**
     * Query item position in the list that matching by the given request
     */
    abstract queryPosition(ref: ModelRefNorm, request: Query): Observable<number | undefined>

    /**
     * Froce Slice boundaries, useful in array, or obeservable providers
     */
    clampSlice(slice: Slice): Observable<Slice> {
        return of(slice)
    }

    filterNormalize(filter: any): FilterNormalized | undefined {
        return filterNormalize(filter)
    }

    filterMerge(...filters: any[]): FilterNormalized | undefined {
        return filterMerge(...filters)
    }

    sorterNormalize(sorter: any): SorterNormalized {
        return sorterNormalize(sorter)
    }

    sorterMerge(...sorters: any[]): SorterNormalized | undefined {
        return sorterMerge(...sorters)
    }

    grouperNormalize(grouper: any): GrouperNormalized {
        return grouperNormalize(grouper)
    }

    grouperMerge(...groupers: any[]): GrouperNormalized | undefined {
        return grouperMerge(...groupers)
    }

    slimerNormalize(slimer: any): SlimerNormalized {
        return slimerNormalize(slimer)
    }

    slimerMerge(...slimers: any[]): SlimerNormalized | undefined {
        return slimerMerge(...slimers)
    }

    /**
     * @returns New data source instance
     */
    toDataSource(store?: CollectionStore<T>): DataSource<T> {
        return new DataSource(this, store)
    }
}
