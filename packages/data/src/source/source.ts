import { DataSource as CdkDataSource, CollectionViewer } from "@angular/cdk/collections"

import {
    BehaviorSubject,
    combineLatest,
    concatMap,
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

import { isEqual, merge } from "lodash"

import { ConnectProtocol, deepClone, deepFreeze, DeepReadonly } from "@ngutil/common"

import type { Model, ModelRef } from "../model"
import type { DataProvider } from "../provider/provider"
import type { Filter, Grouper, Query, Slice, Slimer, Sorter } from "../query"
import { type CollectionStore, MemoryStore, type PartialCollection } from "../store"
import { FilterCombined, GrouperCombined, SlimerCombined, SorterCombined } from "./properties"

const DEBOUNCE_TIME = 50

type DSQuery<T extends Model> = Query<T> & { slice: DeepReadonly<Slice> }

export class DataSource<T extends Model> extends CdkDataSource<T | undefined> implements ConnectProtocol {
    readonly busy$ = new BehaviorSubject<boolean>(false)
    readonly total$ = new BehaviorSubject<number | undefined>(undefined)

    readonly filter = new FilterCombined<Filter<T>>()
    readonly sorter = new SorterCombined<Sorter<T>>()
    readonly slimer = new SlimerCombined<Slimer<T>>()
    readonly grouper = new GrouperCombined<Grouper<T>>()

    readonly #queryBase = combineLatest({
        filter: this.filter.merged$,
        sorter: this.sorter.merged$,
        slimer: this.slimer.merged$,
        grouper: this.grouper.merged$
    }).pipe(shareReplay(1))

    readonly #slice = new ReplaySubject<Slice>(1)
    readonly slice$: Observable<Slice> = this.#slice.pipe(
        switchMap(slice => this.provider.clampSlice(slice)),
        distinctUntilChanged(isEqual),
        map(slice => deepFreeze(deepClone(slice))),
        shareReplay(1)
    )

    readonly #reload = new Subject<void>()
    readonly reset$: Observable<unknown> = merge(this.#queryBase, this.#reload).pipe(
        tap(() => this.#setBusy(true)),
        switchMap(() => this.store.clear()),
        shareReplay(1)
    )

    readonly query$: Observable<DSQuery<T>> = combineLatest({ base: this.#queryBase, slice: this.slice$ }).pipe(
        map(({ base, slice }) => {
            return { ...base, slice }
        }),
        shareReplay(1)
    )

    readonly items$: Observable<PartialCollection<T>> = combineLatest({ query: this.query$, reset: this.reset$ }).pipe(
        tap(() => this.#setBusy(true)),
        debounceTime(DEBOUNCE_TIME),
        switchMap(({ query }) => {
            return this.store.hasSlice(query.slice).pipe(
                switchMap(hasSlice => {
                    if (hasSlice) {
                        return this.store.getSlice(query.slice)
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
        }),
        finalize(() => this.#setBusy(false)),
        shareReplay(1)
    )

    readonly store: CollectionStore<T>
    constructor(
        public readonly provider: DataProvider<T>,
        store?: CollectionStore<T>
    ) {
        super()
        if (store == null) {
            store = new MemoryStore()
        }
        this.store = store
    }

    setSlice(slice: Slice) {
        this.#slice.next(slice)
        return this
    }

    all() {
        return this.setSlice({start: 0, end: Infinity})
    }

    realod() {
        this.#reload.next()
    }

    getItem(ref: ModelRef): Observable<T | undefined> {
        const refn = this.provider.meta.normalizeRef(ref)
        return this.#storeFirst(
            query => this.store.get(refn),
            query => this.provider.queryItem(refn, query)
        )
    }

    getItemPosition(ref: ModelRef): Observable<number | undefined> {
        const refn = this.provider.meta.normalizeRef(ref)
        return this.#storeFirst(
            query => this.store.indexOf(refn).pipe(map(i => (i < 0 ? undefined : i))),
            query => this.provider.queryPosition(refn, query)
        )
    }

    realodItem(ref: ModelRef, insertPosition?: number): Observable<T | undefined> {
        const refn = this.provider.meta.normalizeRef(ref)
        return this.query$.pipe(
            switchMap(query => this.provider.queryItem(refn, query)),
            switchMap(item =>
                item != null ? this.store.updateOrInsert(refn, item, insertPosition).pipe(map(() => item)) : of(item)
            ),
            take(1)
        )
    }

    #storeFirst<X>(
        storeFn: (query: Query<T>) => Observable<X>,
        selfFn: (query: Query<T>) => Observable<X>
    ): Observable<X> {
        return this.query$.pipe(
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
