import { map, Observable, take } from "rxjs"

import { Model, ModelMeta, ModelMetaInput, ModelRefNorm } from "../model"
import { queryExecutor, QueryExecutor, QueryResult, QueryWithSlice, Slice, sliceClamp } from "../query"
import { DataProvider } from "./provider"

export abstract class LocalProvider<T extends Model> extends DataProvider<T> {
    override readonly isAsync = false
    override readonly meta: ModelMeta<T>
    abstract readonly items$: Observable<readonly T[]>

    #executor?: QueryExecutor<T>

    constructor(meta: ModelMetaInput<T>) {
        super()
        this.meta = ModelMeta.coerce(meta)
    }

    executor(request: QueryWithSlice<T>): QueryExecutor<T> {
        return (this.#executor = queryExecutor(request, this.#executor))
    }

    override queryList(request: QueryWithSlice<T>): Observable<QueryResult<T>> {
        const exec = this.executor(request)
        return this.items$.pipe(map(items => exec(items)))
    }

    override queryItem(ref: ModelRefNorm, request: QueryWithSlice<T>): Observable<T | undefined> {
        return this.queryList(request).pipe(map(list => list.items.find(ref.toFilter())))
    }

    override queryPosition(ref: ModelRefNorm, request: QueryWithSlice<T>): Observable<number | undefined> {
        return this.queryList(request).pipe(map(list => list.items.findIndex(ref.toFilter())))
    }

    override clampSlice(slice: Slice): Observable<Slice> {
        return this.items$.pipe(
            take(1),
            map(items => sliceClamp(slice, { start: 0, end: items.length }))
        )
    }
}
