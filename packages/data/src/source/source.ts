import { DataSource as CdkDataSource, CollectionViewer } from "@angular/cdk/collections"

import {
    BehaviorSubject,
    catchError,
    combineLatest,
    distinctUntilChanged,
    EMPTY,
    filter,
    map,
    merge,
    Observable,
    of,
    ReplaySubject,
    shareReplay,
    Subject,
    switchMap,
    take,
    takeUntil,
    tap,
    timer
} from "rxjs"

import { isEqual } from "es-toolkit"

import { ConnectProtocol, deepClone, deepFreeze, isFalsy } from "@ngutil/common"

import type { Model, ModelRef } from "../model"
import type { DataProvider } from "../provider/provider"
import type { Filter, QueryResult, QueryWithSlice, Slice } from "../query"
import { querySubject } from "../query"
import { type CollectionStore, MemoryStore, type PartialCollection } from "../store"

const DEBOUNCE_TIME = 50
const EMPTY_RESULT: QueryResult<Model> = { items: [], total: undefined }

export class DataSource<T extends Model> extends CdkDataSource<T | undefined> implements ConnectProtocol {
    readonly isBusy$ = new BehaviorSubject<boolean>(false)
    readonly total$ = new BehaviorSubject<number | undefined>(undefined)

    readonly #slice = new ReplaySubject<Slice>(1)
    readonly slice$: Observable<Slice> = this.#slice.pipe(
        switchMap(slice => this.provider.clampSlice(slice)),
        distinctUntilChanged(isEqual),
        map(slice => deepFreeze(deepClone(slice))),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    readonly #reload = new BehaviorSubject<void>(undefined)

    readonly #query: Observable<QueryWithSlice<T>> = combineLatest({
        query: this.query$,
        reload: merge(this.#reload, this.provider.changed$)
    }).pipe(
        // tap(() => this.#setBusy(true)),
        // TODO: maybe silent reset or prevent items$ chenges
        // TODO: alternative solution use cacheId, and query item from store with this cacheId
        switchMap(({ query }) =>
            this.store.clear().pipe(
                map(() => {
                    this.total$.next(undefined)
                    ;(this.reset$ as Subject<void>).next(void 0)
                    return query
                })
            )
        ),
        switchMap(query =>
            this.slice$.pipe(
                map(slice => {
                    // this.#setBusy(true)
                    return { ...query, slice }
                })
            )
        ),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    readonly reset$: Observable<void> = new Subject<void>()

    readonly items$: Observable<PartialCollection<T>> = this.#query.pipe(
        switchMap(v => (this.provider.isAsync ? timer(DEBOUNCE_TIME).pipe(map(() => v)) : of(v))),
        switchMap(query =>
            this.store.hasSlice(query.slice).pipe(
                take(1),
                switchMap(hasSlice => {
                    if (!hasSlice) {
                        this.#setBusy(true)
                        return this.provider.queryList(query).pipe(
                            take(1),
                            catchError(() => {
                                this.#setBusy(false)
                                return of(EMPTY_RESULT as QueryResult<T>)
                            }),
                            tap(() => this.#setBusy(false)),
                            switchMap(result => {
                                if (result.total != null) {
                                    this.total$.next(result.total)
                                } else if (result.items.length < query.slice.end - query.slice.start) {
                                    this.total$.next(query.slice.start + result.items.length)
                                }
                                return this.store.insertSlice(query.slice, result.items).pipe(take(1))
                            })
                        )
                    } else {
                        // XXX: the return value is irrelevant
                        return of(EMPTY_RESULT as QueryResult<T>)
                    }
                }),
                switchMap(() => this.store.getSlice(query.slice).pipe(take(1)))
            )
        ),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    readonly isEmpty$ = combineLatest({ busy: this.isBusy$, items: this.items$ }).pipe(
        filter(({ busy }) => !busy),
        map(({ items }) => items.every(isFalsy)),
        shareReplay({ bufferSize: 1, refCount: true })
    )

    constructor(
        public readonly provider: DataProvider<T>,
        public readonly store: CollectionStore<T> = new MemoryStore(),
        public readonly query$ = querySubject(provider, "normal", "forced")
    ) {
        super()
    }

    setSlice(slice: Slice) {
        this.#slice.next(slice)
        return this
    }

    setFilter(filter: Partial<Record<"normal" | "forced", Filter<T>>>) {
        for (const [k, v] of Object.entries(filter)) {
            this.query$.filter[k as "normal" | "forced"].set(v)
        }
        return this
    }

    updateFilter(filter: Partial<Record<"normal" | "forced", Filter<T>>>) {
        for (const [k, v] of Object.entries(filter)) {
            this.query$.filter[k as "normal" | "forced"].update(v)
        }
        return this
    }

    all() {
        return this.setSlice({ start: 0, end: Infinity })
    }

    reload() {
        this.#reload.next()
    }

    getItem(ref: ModelRef): Observable<T | undefined> {
        const refn = this.provider.meta.normalizeRef(ref)
        return this.store.get(refn).pipe(
            take(1),
            switchMap(result => {
                if (result == null) {
                    return this.provider.queryItem(refn).pipe(take(1))
                }
                return of(result)
            })
        )
    }

    watchItem(ref: ModelRef): Observable<T | undefined> {
        const refn = this.provider.meta.normalizeRef(ref)
        return this.#storeFirst(
            query => this.store.get(refn),
            query => this.provider.queryItem(refn, query)
        )
    }

    getItemPosition(ref: ModelRef): Observable<number | undefined> {
        return this.watchItemPosition(ref).pipe(take(1))
    }

    watchItemPosition(ref: ModelRef): Observable<number | undefined> {
        const refn = this.provider.meta.normalizeRef(ref)
        return this.#storeFirst(
            query => this.store.indexOf(refn).pipe(map(i => (i < 0 ? undefined : i))),
            query => this.provider.queryPosition(refn, query)
        )
    }

    realodItem(ref: ModelRef, insertPosition?: number): Observable<T | undefined> {
        const refn = this.provider.meta.normalizeRef(ref)
        return this.#query.pipe(
            take(1),
            switchMap(query => this.provider.queryItem(refn, query).pipe(take(1))),
            switchMap(item =>
                item != null ? this.store.updateOrInsert(refn, item, insertPosition).pipe(map(() => item)) : of(item)
            )
        )
    }

    #storeFirst<X>(
        storeFn: (query: QueryWithSlice<T>) => Observable<X>,
        selfFn: (query: QueryWithSlice<T>) => Observable<X>
    ): Observable<X> {
        return this.#query.pipe(
            take(1),
            switchMap(query => storeFn(query).pipe(switchMap(result => (result == null ? selfFn(query) : of(result)))))
        )
    }

    #setBusy(busy: boolean) {
        if (this.isBusy$.value !== busy) {
            // dont set true when not async provider, but false is also set
            if (busy && !this.provider.isAsync) {
                return
            }
            this.isBusy$.next(busy)
        }
    }

    #cvSubs = new Map<CollectionViewer, Subject<void>>()

    override connect(collectionViewer: CollectionViewer) {
        const until = new Subject<void>()

        this.#cvSubs.get(collectionViewer)?.next()
        this.#cvSubs.set(collectionViewer, until)

        return new Observable<PartialCollection<T>>(subscriber => {
            const sub1 = collectionViewer.viewChange.subscribe(this.#slice)
            const sub2 = this.items$.subscribe(subscriber)

            return () => {
                if (this.#cvSubs.get(collectionViewer) === until) {
                    this.#cvSubs.delete(collectionViewer)
                }
                sub1.unsubscribe()
                sub2.unsubscribe()
            }
        }).pipe(takeUntil(until))
    }

    override disconnect(collectionViewer: CollectionViewer): void {
        this.#cvSubs.get(collectionViewer)?.next()
        this.#cvSubs.delete(collectionViewer)
    }
}
