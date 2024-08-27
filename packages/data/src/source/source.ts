import { DataSource as CdkDataSource, CollectionViewer } from "@angular/cdk/collections"

import {
    BehaviorSubject,
    combineLatest,
    debounceTime,
    distinctUntilChanged,
    finalize,
    map,
    Observable,
    of,
    ReplaySubject,
    shareReplay,
    Subject,
    Subscriber,
    switchMap,
    take,
    takeUntil,
    tap
} from "rxjs"

import { isEqual } from "lodash"

import { ConnectProtocol, deepClone, deepFreeze, isTruthy } from "@ngutil/common"

import type { Model, ModelRef } from "../model"
import type { DataProvider } from "../provider/provider"
import type { QueryWithSlice, Slice } from "../query"
import { querySubject } from "../query"
import { type CollectionStore, MemoryStore, type PartialCollection } from "../store"

const DEBOUNCE_TIME = 50

export class DataSource<T extends Model> extends CdkDataSource<T | undefined> implements ConnectProtocol {
    readonly busy$ = new BehaviorSubject<boolean>(false)
    readonly total$ = new BehaviorSubject<number | undefined>(undefined)

    readonly #slice = new ReplaySubject<Slice>(1)
    readonly slice$: Observable<Slice> = this.#slice.pipe(
        switchMap(slice => this.provider.clampSlice(slice)),
        distinctUntilChanged(isEqual),
        map(slice => deepFreeze(deepClone(slice))),
        shareReplay(1)
    )

    readonly #reload = new BehaviorSubject<void>(undefined)

    readonly #query: Observable<QueryWithSlice<T>> = combineLatest({
        query: this.query$,
        reload: this.#reload
    }).pipe(
        tap(() => this.#setBusy(true)),
        // TODO: maybe silent reset or prevent items$ chenges
        // TODO: alternative solution use cacheId, and query item from store with this cacheId
        switchMap(({ query }) => this.store.clear().pipe(map(() => query))),
        switchMap(query =>
            this.slice$.pipe(
                tap(() => this.#setBusy(true)),
                map(slice => {
                    return { ...query, slice }
                })
            )
        ),
        shareReplay(1)
    )

    readonly items$: Observable<PartialCollection<T>> = this.#query.pipe(
        tap(() => this.#setBusy(true)),
        debounceTime(DEBOUNCE_TIME),
        // tap(query => console.log(query)),
        switchMap(query =>
            this.store.hasSlice(query.slice).pipe(
                take(1),
                switchMap(hasSlice => {
                    if (hasSlice) {
                        return this.store.getSlice(query.slice).pipe(take(1))
                    } else {
                        return this.provider.queryList(query).pipe(
                            switchMap(result => {
                                if (result.total != null) {
                                    this.total$.next(result.total)
                                }
                                return this.store.insertSlice(query.slice, result.items)
                            }),
                            take(1)
                        )
                    }
                })
            )
        ),
        finalize(() => this.#setBusy(false)),
        shareReplay(1)
    )

    readonly isEmpty$ = combineLatest({ busy: this.busy$, items: this.items$ }).pipe(
        map(({ busy, items }) => !busy && items?.some(isTruthy)),
        shareReplay(1)
    )

    constructor(
        public readonly provider: DataProvider<T>,
        public readonly store: CollectionStore<T> = new MemoryStore(),
        public readonly query$ = querySubject("normal", "forced")
    ) {
        super()
    }

    setSlice(slice: Slice) {
        this.#slice.next(slice)
        return this
    }

    all() {
        return this.setSlice({ start: 0, end: Infinity })
    }

    realod() {
        this.#reload.next()
    }

    getItem(ref: ModelRef): Observable<T | undefined> {
        return this.watchItem(ref).pipe(take(1))
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
        if (this.provider.isAsync) {
            if (this.busy$.value !== busy) {
                this.busy$.next(busy)
            }
        }
    }

    #cvSubs = new Map<CollectionViewer, Subject<void>>()

    override connect(collectionViewer: CollectionViewer): Observable<readonly (T | undefined)[]> {
        const until = new Subject<void>()

        this.#cvSubs.get(collectionViewer)?.next()
        this.#cvSubs.set(collectionViewer, until)

        return new Observable((subscriber: Subscriber<readonly (T | undefined)[]>) => {
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
