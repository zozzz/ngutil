import { DataSource as CdkDataSource, CollectionViewer } from "@angular/cdk/collections"
import { Directive, Input, OnDestroy, Optional, input } from "@angular/core"
import { takeUntilDestroyed, toSignal } from "@angular/core/rxjs-interop"

import {
    combineLatest,
    finalize,
    Observable,
    of,
    ReplaySubject,
    share,
    Subject,
    Subscription,
    switchMap,
    takeUntil,
    tap,
    throwError
} from "rxjs"

import { Busy, ConnectProtocol } from "@ngutil/common"

import { Model } from "../model"
import { DataProvider } from "../provider/provider"
import { Filter, Grouper, Slimer, Sorter } from "../query"
import { DataSource } from "./source"

export type DataSourceInput<T extends Model> = any

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
export class DataSourceProxy<T extends Model = Model>
    extends CdkDataSource<T | undefined>
    implements OnDestroy, ConnectProtocol {

    @Input({ required: true, alias: "nuDataSource" })
    set value(value: DataSourceInput<T>) {
        this.#valueSub?.unsubscribe()
        this.#valueSub = coerceDataSource<T>(value)
            .pipe(
                tap(v => {
                    if (v == null) {
                        throw new Error("Missing DataSource")
                    }
                })
            )
            .subscribe(this.#value)
    }

    get value(): DataSource<T> {
        return this.#valueSig()!
    }

    #valueSub?: Subscription
    readonly #value = new ReplaySubject<DataSource<T>>(1)
    readonly value$ = this.#value.pipe(takeUntilDestroyed())
    readonly #valueSig = toSignal(this.value$)

    readonly items$ = this.value$.pipe(
        switchMap(value => value.items$),
        share()
    )

    readonly busy$ = this.value$.pipe(
        switchMap(value => value.busy$),
        share()
    )
    readonly isBusy = toSignal(this.busy$, { rejectErrors: true, initialValue: false })

    @Input()
    set filter(value: Filter<T>) {
        this.#filter.next(value)
    }
    readonly #filter = new ReplaySubject<Filter<T>>(1)

    @Input()
    set sorter(value: Sorter<T>) {
        this.#sorter.next(value)
    }
    readonly #sorter = new ReplaySubject<Sorter<T>>(1)

    @Input()
    set grouper(value: Grouper<T>) {
        this.#grouper.next(value)
    }
    readonly #grouper = new ReplaySubject<Grouper<T>>(1)

    @Input()
    set slimer(value: Slimer<T>) {
        this.#slimer.next(value)
    }
    readonly #slimer = new ReplaySubject<Slimer<T>>(1)

    readonly #subs = new Subscription()

    constructor(@Optional() busy?: Busy<any>) {
        super()

        if (busy != null) {
            this.#subs.add(busy.connect(this.busy$).subscribe())
        }

        this.#subs.add(
            combineLatest({ src: this.value$, filter: this.#filter }).subscribe(({ src, filter }) => {
                src.filter.forced.set(filter)
            })
        )

        this.#subs.add(
            combineLatest({ src: this.value$, sorter: this.#sorter }).subscribe(({ src, sorter }) => {
                src.sorter.forced.set(sorter)
            })
        )

        this.#subs.add(
            combineLatest({ src: this.value$, grouper: this.#grouper }).subscribe(({ src, grouper }) => {
                src.grouper.forced.set(grouper)
            })
        )

        this.#subs.add(
            combineLatest({ src: this.value$, slimer: this.#slimer }).subscribe(({ src, slimer }) => {
                src.slimer.forced.set(slimer)
            })
        )
    }

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
        this.#subs.unsubscribe()
    }
}

function coerceDataSource<T extends Model>(value: DataSourceInput<T>): Observable<DataSource<T>> {
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
