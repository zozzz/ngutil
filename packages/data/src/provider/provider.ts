import type { Observable } from "rxjs"
import { NEVER, of } from "rxjs"

import type { Model, ModelMeta, ModelRefNorm } from "../model"
import type { QueryResult, QueryWithSlice, Slice } from "../query"
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
    abstract queryItem(ref: ModelRefNorm, request?: QueryWithSlice<T>): Observable<T | undefined>

    /**
     * Query item position in the list that matching by the given request
     */
    abstract queryPosition(ref: ModelRefNorm, request: QueryWithSlice<T>): Observable<number | undefined>

    /**
     * Froce Slice boundaries, useful in array, or obeservable providers
     */
    clampSlice(slice: Slice): Observable<Slice> {
        return of(slice)
    }

    /**
     * @returns New data source instance
     */
    toDataSource(store?: CollectionStore<T>): DataSource<T> {
        return new DataSource(this, store)
    }
}
