import { BehaviorSubject, combineLatest, map, Observable, of, take } from "rxjs"

import { Model, ModelRefNorm } from "../model"
import { Slice, sliceApply, sliceClamp, sliceEq, sliceInsert } from "../query"
import { CollectionStore, PartialCollection } from "./collection-store"
import { isTruthy } from "@ngutil/common"

export class MemoryStore<T extends Model> extends CollectionStore<T> {
    readonly #data = new BehaviorSubject<PartialCollection<T>>([])

    override insertSlice(slice: Slice, items: readonly T[]): Observable<PartialCollection<T>> {
        this.#data.next(sliceInsert(slice, this.#data.value, items))
        return this.#data
    }

    override hasSlice(slice: Slice): Observable<boolean> {
        return this.#data.pipe(
            map(data => {
                if (sliceEq(slice, sliceClamp(slice, { start: 0, end: data.length }))) {
                    for (let i = slice.start; i < slice.end; i++) {
                        if (data[i] == null) {
                            return false
                        }
                    }
                    return true
                } else {
                    return false
                }
            })
        )
    }

    override getSlice(slice: Slice): Observable<PartialCollection<T>> {
        return this.#data.pipe(map(data => sliceApply(slice, data)))
    }

    override get(ref: ModelRefNorm): Observable<T | undefined> {
        return this.#data.pipe(map(data => data.find(ref.toFilter())))
    }

    override indexOf(ref: ModelRefNorm): Observable<number> {
        return this.#data.pipe(map(data => data.findIndex(ref.toFilter())))
    }

    override update(ref: ModelRefNorm, item: T): Observable<number> {
        return combineLatest({
            index: this.indexOf(ref),
            data: this.#data
        }).pipe(
            take(1),
            map(({ index, data }) => {
                if (index < 0) {
                    return index
                }
                this.#data.next(sliceInsert({ start: index, end: index + 1 }, data, [item]))
                return index
            })
        )
    }

    override updateOrInsert(ref: ModelRefNorm, item: T, position?: number): Observable<number> {
        return combineLatest({
            index: this.indexOf(ref),
            data: this.#data
        }).pipe(
            take(1),
            map(({ index, data }) => {
                if (index < 0) {
                    index = position == null ? data.length : position < 0 ? data.length : position
                }
                this.#data.next(sliceInsert({ start: index, end: index + 1 }, data, [item]))
                return index
            })
        )
    }

    override del(ref: ModelRefNorm): Observable<number> {
        return combineLatest({
            index: this.indexOf(ref),
            data: this.#data
        }).pipe(
            take(1),
            map(({ index, data }) => {
                if (index < 0) {
                    return index
                }
                const result = data.slice(0)
                result.splice(index, 1)
                this.#data.next(result)
                return index
            })
        )
    }

    override clear(): Observable<void> {
        if (this.#data.value.length > 0) {
            this.#data.next([])
        }
        return of(undefined)
    }

    override isEmpty(): Observable<boolean> {
        return this.#data.pipe(map(data => data.length === 0 || !data.some(isTruthy)))
    }
}
