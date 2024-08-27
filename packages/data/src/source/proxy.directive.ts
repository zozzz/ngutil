import { DataSource as CdkDataSource, CollectionViewer } from "@angular/cdk/collections"
import { Directive, inject, input, Input, OnDestroy } from "@angular/core"
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop"

import {
    combineLatest,
    finalize,
    map,
    Observable,
    of,
    ReplaySubject,
    shareReplay,
    Subject,
    Subscription,
    switchMap,
    takeUntil,
    throwError
} from "rxjs"

import { Busy, ConnectProtocol } from "@ngutil/common"

import { Model } from "../model"
import { DataProvider } from "../provider/provider"
import { Filter, Grouper, Slimer, Sorter } from "../query"
import { DataSource } from "./source"

export type DataSourceProxyInput<T extends Model> = DataSourceProxy<T> | DataSource<T> | DataProvider<T>

/**
 * @example
 * ```html
 * <table [nuDataSource]="..." [filter]="{isActive: true}" [sorter]="[{name: 'asc'}]"></table>
 * ```
 *
 * ```ts
 * @Component({
 *   template: `<table [nuDataSource]="users$"></table>`
 * })
 * class UserTable {
 *   readonly userService = inject(UserService)
 *   readonly users$ = UserService.all()
 * }
 * ```
 *
 * ```ts
 * @Component({
 *   selector: "table.my-table",
 *   template: `
 *   <cdk-virtual-scroll-viewport itemSize="50" class="example-viewport">
 *       <div *cdkVirtualFor="let item of dataSource" class="example-item">{{item}}</div>
 *   </cdk-virtual-scroll-viewport>
 *   `
 * })
 * class TableComponent {
 *   readonly dataSource = inject(DataSourceProxy)
 * }
 * ```
 */
@Directive({
    standalone: true,
    selector: "[nuDataSource]",
    exportAs: "nuDataSource"
})
export class DataSourceProxy<T extends Model>
    extends CdkDataSource<T | undefined>
    implements OnDestroy, ConnectProtocol
{
    @Input({ required: true, alias: "nuDataSource" })
    set value(value: DataSourceProxyInput<T>) {
        this.#valueSub?.unsubscribe()
        this.#valueSub = coerceDataSource<T>(value).subscribe(this.#value)
    }

    #valueSub?: Subscription
    readonly #value = new ReplaySubject<DataSource<T>>(1)
    readonly value$ = this.#value.pipe(takeUntilDestroyed())
    readonly query$ = this.value$.pipe(
        map(value => value.query$),
        shareReplay(1)
    )

    readonly items$ = this.value$.pipe(
        switchMap(value => value.items$),
        shareReplay(1)
    )

    readonly isBusy$ = this.value$.pipe(
        switchMap(value => value.isBusy$),
        shareReplay(1)
    )

    readonly isEmpty$ = this.value$.pipe(
        switchMap(value => value.isEmpty$),
        shareReplay(1)
    )

    #cvSubs = new Map<CollectionViewer, Subject<void>>()

    override connect(collectionViewer: CollectionViewer): Observable<readonly (T | undefined)[]> {
        const until = new Subject<void>()

        this.#cvSubs.get(collectionViewer)?.next()
        this.#cvSubs.set(collectionViewer, until)

        return this.value$.pipe(
            switchMap(value => value.connect(collectionViewer)),
            takeUntil(until),
            finalize(() => this.#cvSubs.delete(collectionViewer))
        )
    }

    override disconnect(collectionViewer: CollectionViewer): void {
        this.#cvSubs.get(collectionViewer)?.next()
        this.#cvSubs.delete(collectionViewer)
    }

    ngOnDestroy(): void {
        this.#valueSub?.unsubscribe()
        this.#valueSub = undefined
    }
}

@Directive({
    standalone: true,
    selector: "[nuDataSource][filter]"
})
export class DataSourceProxyFilter<T extends Model, F extends Filter<T>> {
    readonly #proxy = inject<DataSourceProxy<T>>(DataSourceProxy)
    readonly filter = input.required<F>()
    readonly filter$ = toObservable(this.filter)

    constructor() {
        combineLatest({ query: this.#proxy.query$, filter: this.filter$ })
            .pipe(takeUntilDestroyed())
            .subscribe(({ query, filter }) => query.filter.forced.set(filter))
    }
}

@Directive({
    standalone: true,
    selector: "[nuDataSource][sorter]"
})
export class DataSourceProxySorter<T extends Model, S extends Sorter<T>> {
    readonly #proxy = inject<DataSourceProxy<T>>(DataSourceProxy)
    readonly sorter = input.required<S>()
    readonly sorter$ = toObservable(this.sorter)

    constructor() {
        combineLatest({ query: this.#proxy.query$, sorter: this.sorter$ })
            .pipe(takeUntilDestroyed())
            .subscribe(({ query, sorter }) => query.sorter.forced.set(sorter))
    }
}

@Directive({
    standalone: true,
    selector: "[nuDataSource][slimer]"
})
export class DataSourceProxySlimer<T extends Model, S extends Slimer<T>> {
    readonly #proxy = inject<DataSourceProxy<T>>(DataSourceProxy)
    readonly slimer = input.required<S>()
    readonly slimer$ = toObservable(this.slimer)

    constructor() {
        combineLatest({ query: this.#proxy.query$, slimer: this.slimer$ })
            .pipe(takeUntilDestroyed())
            .subscribe(({ query, slimer }) => query.slimer.forced.set(slimer))
    }
}

@Directive({
    standalone: true,
    selector: "[nuDataSource][grouper]"
})
export class DataSourceProxyGrouper<T extends Model, G extends Grouper<T>> {
    readonly #proxy = inject<DataSourceProxy<T>>(DataSourceProxy)
    readonly grouper = input.required<G>()
    readonly grouper$ = toObservable(this.grouper)

    constructor() {
        combineLatest({ query: this.#proxy.query$, grouper: this.grouper$ })
            .pipe(takeUntilDestroyed())
            .subscribe(({ query, grouper }) => query.grouper.forced.set(grouper))
    }
}

@Directive({
    standalone: true,
    selector: "[nuDataSource][nuBusy]"
})
export class DataSourceProxyBusy {
    readonly #proxy = inject<DataSourceProxy<any>>(DataSourceProxy)
    readonly #busy = inject<Busy<any>>(Busy)

    readonly isBusy$ = this.#proxy.value$.pipe(
        switchMap(value => value.isBusy$),
        shareReplay(1)
    )

    constructor() {
        this.#busy.connect(this.isBusy$).pipe(takeUntilDestroyed()).subscribe()
    }
}

function coerceDataSource<T extends Model>(value: DataSourceProxyInput<T>): Observable<DataSource<T>> {
    if (value instanceof DataSourceProxy) {
        return value.value$
    } else if (value instanceof DataSource) {
        return of(value)
    } else if (value instanceof DataProvider) {
        return of(value.toDataSource())
    } else {
        return throwError(() => new Error("Invalid DataSource value"))
    }
}
