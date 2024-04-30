import { BehaviorSubject, combineLatest, map, Observable, shareReplay } from "rxjs"

import { isEqual } from "lodash"

import { deepClone, deepFreeze } from "@ngutil/common"

import { readonlyProp } from "./util"

export interface QueryPropertyClass<T> {
    new (value?: T): QueryProperty<T>

    merge<V>(...values: V[]): V | undefined
}

export abstract class QueryProperty<T> extends BehaviorSubject<T | undefined> {
    set(value?: T) {
        this.#nextClone(value)
    }

    del(): void {
        this.set(undefined)
    }

    update(value?: T): void {
        if (!isEqual(this.value, value)) {
            this.#next(this.merge(this.value, value))
        }
    }

    /**
     * Merge values and emit when changed (dont change original values)
     */
    protected abstract merge(a?: T, b?: T): T | undefined

    #next(value?: T) {
        if (!isEqual(this.value, value)) {
            if (value == null) {
                this.next(undefined)
            } else {
                this.next(value)
            }
        }
    }

    #nextClone(value?: T) {
        if (!isEqual(this.value, value)) {
            if (value == null) {
                this.next(undefined)
            } else {
                this.next(deepClone<any>(value))
            }
        }
    }
}

export abstract class QueryPropertySet<T> extends Observable<T> {
    readonly #combined: Observable<T>

    constructor(...names: string[]) {
        super(dest => this.#combined.subscribe(dest))

        const observables: Array<Observable<any>> = []
        const props: { [key: string]: Observable<any> } = {}

        for (const name of names) {
            const o = this.newProperty()
            observables.push(o)
            props[name] = o
        }

        this.#combined = combineLatest(observables).pipe(
            map(values => deepFreeze(this.merge(...values))),
            shareReplay(1)
        )

        for (const [k, v] of Object.entries(props)) {
            readonlyProp(this, k, v)
        }
    }

    protected abstract newProperty(): QueryProperty<T>
    protected abstract merge(...args: any[]): any | undefined
}

export type QueryPropertySetOf<T, P, N extends string[]> = T & { [K in N[number]]: P }
