import { BehaviorSubject, combineLatest, map, Observable, shareReplay } from "rxjs"

import { isEqual } from "lodash-es"

import { deepClone, deepFreeze } from "@ngutil/common"

import { readonlyProp } from "./common"

export abstract class QueryProperty<I, O> extends BehaviorSubject<O | undefined> {
    set(value?: I | O) {
        this.#nextClone(value != null ? this.norm(value) : undefined)
    }

    update(value?: I | O): void {
        const norm = value != null ? this.norm(value) : undefined
        if (!isEqual(this.value, norm)) {
            this.#next(this.merge(this.value, norm))
        }
    }

    del(): void {
        this.set(undefined)
    }

    /**
     * Merge values and emit when changed (dont change original values)
     */
    protected abstract merge(a?: O, b?: O): O | undefined
    protected abstract norm(a: I | O): O | undefined

    #next(value?: O) {
        if (!isEqual(this.value, value)) {
            if (value == null) {
                this.next(undefined)
            } else {
                this.next(value)
            }
        }
    }

    #nextClone(value?: O) {
        if (!isEqual(this.value, value)) {
            if (value == null) {
                this.next(undefined)
            } else {
                this.next(deepClone<any>(value))
            }
        }
    }
}

export abstract class QueryPropertySet<O> extends Observable<O> {
    readonly #combined: Observable<O>

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

    protected abstract newProperty(): QueryProperty<any, any>
    protected abstract merge(...args: any[]): any | undefined
}

export type QueryPropertySetOf<T, P, N extends string[]> = T & { [K in N[number]]: P }
