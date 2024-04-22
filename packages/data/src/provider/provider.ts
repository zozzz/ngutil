import type { Observable } from "rxjs"

import type { Model, ModelMeta, ModelRefNorm } from "../model"
import type { Query, QueryResult } from "../query"
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
     * Query items by the given request
     */
    abstract queryList(request: Query<T>): Observable<QueryResult<T>>

    /**
     * Query exactly one item by the given request
     */
    abstract queryItem(ref: ModelRefNorm, request: Query<T>): Observable<T | undefined>

    /**
     * Query item position in the list that matching by the given request
     */
    abstract queryPosition(ref: ModelRefNorm, request: Query<T>): Observable<number | undefined>

    /**
     * @returns New data source instance
     */
    toDataSource(store?: CollectionStore<T>): DataSource<T> {
        return new DataSource(this, store)
    }
}
