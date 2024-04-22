import { map, Observable } from "rxjs"

import { Model, ModelMeta, ModelMetaInput, ModelRefNorm } from "../model"
import { Query, queryExecutor, QueryExecutor, QueryResult } from "../query"
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

    executor(request: Query<T>): QueryExecutor<T> {
        return (this.#executor = queryExecutor(request, this.#executor))
    }

    override queryList(request: Query<T>): Observable<QueryResult<T>> {
        const exec = this.executor(request)
        return this.items$.pipe(map(items => exec(items)))
    }

    override queryItem(ref: ModelRefNorm, request: Query<T>): Observable<T | undefined> {
        return this.queryList(request).pipe(map(list => list.items.find(ref.toFilter())))
    }

    override queryPosition(ref: ModelRefNorm, request: Query<T>): Observable<number | undefined> {
        return this.queryList(request).pipe(map(list => list.items.findIndex(ref.toFilter())))
    }
}
