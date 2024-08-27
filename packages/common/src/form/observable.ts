import { takeUntilDestroyed } from "@angular/core/rxjs-interop"
import { FormControl } from "@angular/forms"

import { debounceTime, distinctUntilChanged, map, Observable, startWith } from "rxjs"

import { isEqual } from "lodash"

export interface ObservableOptions {
    distinct?: boolean
    destruct?: boolean
}

export type FormControlProperties =
    | "valid"
    | "invalid"
    | "status"
    | "pristine"
    | "dirty"
    | "touched"
    | "untouched"
    | "disabled"
    | "enabled"
    | "errors"

export const DEFAULT = { distinct: true, destruct: true }

export function fcObservableValue<T>(fc: FormControl<T>, opts: ObservableOptions & { debounce?: number } = DEFAULT) {
    let result = fc.valueChanges.pipe(
        startWith(null),
        map(() => fc.value)
    )

    if (opts.debounce) {
        result = result.pipe(debounceTime(opts.debounce))
    }

    return handleCommonOptions(result, opts)
}

export function fcObservableProperty<T, P extends FormControlProperties>(
    fc: FormControl<T>,
    property: P,
    opts: ObservableOptions = DEFAULT
): Observable<FormControl<T>[P]> {
    const result = fc.statusChanges.pipe(
        startWith(null),
        map(() => fc[property])
    )

    return handleCommonOptions(result, opts)
}

function handleCommonOptions<T>(o: Observable<T>, opts: ObservableOptions): Observable<T> {
    if (opts.distinct) {
        o = o.pipe(distinctUntilChanged(isEqual))
    }

    if (opts.destruct) {
        o = o.pipe(takeUntilDestroyed())
    }

    return o
}
