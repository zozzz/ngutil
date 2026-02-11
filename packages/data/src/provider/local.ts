import { map, Observable, take } from "rxjs"

import { Model, ModelMeta, ModelMetaInput, ModelRefNorm } from "../model"
import { queryExecutor, QueryExecutor, QueryResult, QueryWithSlice, Slice, sliceClamp, type Query } from "../query"
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

    override queryItem(ref: ModelRefNorm, request: Query): Observable<T | undefined> {
        const items = request ? this.queryList({...request, slice: {start:0, end: Infinity}}).pipe(map(list => list.items)) : this.items$
        return items.pipe(map(items => items.find(ref.toFilter())))
    }

    override queryPosition(ref: ModelRefNorm, request: Query): Observable<number | undefined> {
        return this.queryList({...request, slice: {start:0, end: Infinity}}).pipe(map(list => list.items.findIndex(ref.toFilter())))
    }

    override clampSlice(slice: Slice): Observable<Slice> {
        return this.items$.pipe(
            take(1),
            map(items => sliceClamp(slice, { start: 0, end: items.length }))
        )
    }
}
