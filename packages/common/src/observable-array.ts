import { BehaviorSubject } from "rxjs"

import onChange from "on-change"

export class ObservableArray<T> extends BehaviorSubject<T[]> {
    constructor(value: T[]) {
        super(watchArray(value, v => this.next(v)))
    }

    override next(value: T[]): void {
        if (this.value === value) {
            super.next(value)
        } else {
            super.next(watchArray(value, this.next.bind(this)))
        }
    }
}

export function watchArray<T>(array: T[], handler: (array: T[]) => void): T[] {
    return onChange(array, (_, value) => handler(value as T[]), { isShallow: true })
}
