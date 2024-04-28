import { BehaviorSubject, Observable } from "rxjs"

import { isEqual } from "lodash"

import { deepClone } from "@ngutil/common"

const PROXIED = Symbol("PROXIED")

export interface IQueryProperty<T> extends Observable<T | undefined> {
    set(value?: T): void
    del(): void
    update(value?: T): void
}

export interface IQueryCombinedProperty<T> extends Observable<T> {
    readonly normal: IQueryProperty<T>
    readonly forced: IQueryProperty<T>
}

export interface IProxied {
    [PROXIED]: any
}

export function isProxied(v: any) {
    return v != null && v[PROXIED] !== null
}

export abstract class QueryProperty<T> extends BehaviorSubject<T | undefined> implements IQueryProperty<T> {
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

// export class QueryPropertyProxy<T> extends Observable<T> implements IProxied {
//     #pending?: Array<[string, any[]]>
//     #sub?: Subscription;
//     [PROXIED]?: any

//     constructor(source: Observable<IQueryProperty<T>>) {
//         super(dest =>
//             source
//                 .pipe(
//                     tap(prop => {
//                         this[PROXIED] = prop
//                         if (this.#pending) {
//                             const pending = this.#pending
//                             this.#pending = undefined
//                             for (const [fn, args] of pending) {
//                                 ;(prop as any)[fn](...args)
//                             }
//                         }
//                     })
//                 )
//                 .subscribe(dest)
//         )

//         new Proxy(this, {
//             get(target, prop, receiver) {},
//             set(target, prop, value, receiver) {
//                 if ((typeof prop === "string" && prop.startsWith("#")) || prop === PROXIED) {
//                     return Reflect.set(target, prop, value, receiver)
//                 } else {
//                     throw new Error("This is a proxy, every property is readonly")
//                 }
//             }
//         })
//     }

//     #exec(fn: string, ...args: any[]) {
//         if (this[PROXIED] != null) {
//             this[PROXIED][fn](...args)
//         } else {
//             if (this.#pending == null) {
//                 this.#pending = []
//             }
//             this.#pending.push([fn, args])
//             if (this.#sub == null) {
//                 this.#sub = this.subscribe()
//             }
//         }
//     }
// }

// function queryProxy<T extends Observable<any>>(source: T, mutators: string[], observables: string[]): T {

// }
