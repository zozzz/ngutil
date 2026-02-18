import { Observable } from "rxjs"

import { DeepReadonly } from "@ngutil/common"

import { Model, ModelRefNorm } from "../model"
import { Slice } from "../query"

export type PartialCollection<T> = readonly (T | undefined)[]

export abstract class CollectionStore<T extends Model> {
    /**
     * Update the given slice, and return all items observable
     */
    abstract insertSlice(slice: DeepReadonly<Slice>, items: readonly T[]): Observable<PartialCollection<T>>

    /**
     * @returns `true` when the given slice is available in the cache
     */
    abstract hasSlice(slice: DeepReadonly<Slice>): Observable<boolean>

    /**
     * @returns items by the given slice
     */
    abstract getSlice(slice: DeepReadonly<Slice>): Observable<PartialCollection<T>>

    /**
     * Get item from collection
     */
    abstract get(ref: ModelRefNorm): Observable<T | undefined>

    /**
     * Get index of item in collection, -1 if not found
     */
    abstract indexOf(ref: ModelRefNorm): Observable<number>

    /**
     * Update item in collection
     *
     * @returns the updated index, or -1 if not found
     */
    abstract update(ref: ModelRefNorm, item: T): Observable<number>

    /**
     * Update item if exists in collection, or insert at the given position
     *
     * @param position If positon is negative, insert at the end of collection
     * @returns the updated index or index of where to insert
     */
    abstract updateOrInsert(ref: ModelRefNorm, item: T, position?: number): Observable<number>

    /**
     * Remove item from collection
     * @returns the index of deleted item, -1 if not found
     */
    abstract del(ref: ModelRefNorm): Observable<number>

    /**
     * Removes all items from collection
     */
    abstract clear(): Observable<void>

    /**
     * @returns `true` when collection is empty
     */
    abstract isEmpty(): Observable<boolean>
}
