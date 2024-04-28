import { BehaviorSubject, combineLatest, map, Observable, shareReplay } from "rxjs"

import { isEqual } from "lodash"

import { deepClone, deepFreeze, DeepReadonly } from "@ngutil/common"

export abstract class Property<T> extends BehaviorSubject<DeepReadonly<T> | undefined> {
    // readonly #signal: Signal<DeepReadonly<T> | undefined> = toSignal(this, { requireSync: true })

    set(value: T | undefined, clone: boolean = true) {
        if (!isEqual(this.value, value)) {
            if (value != null) {
                this.next(deepFreeze<T>(clone ? deepClone<T>(value) : value) as any)
            } else {
                this.next(undefined)
            }
        }
    }

    get() {
        return this.value
    }

    del(): void {
        this.set(undefined)
    }

    /**
     * Merge values and emit when changed (dont change original values)
     */
    abstract update(other: T): void
}

export abstract class PropertyCombined<T> {
    abstract readonly normal: Property<T>
    abstract readonly forced: Property<T>
    abstract readonly merged$: Observable<DeepReadonly<T> | undefined>
}

export function mergedProperty(merger: (...items: any[]) => any, ...props: Observable<any>[]): Observable<any> {
    if (props.length > 1) {
        return combineLatest(props).pipe(
            map(values => deepFreeze(merger(...values))),
            shareReplay(1)
        )
    } else {
        return props[0] as any
    }
}
