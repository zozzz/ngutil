import { takeUntilDestroyed } from "@angular/core/rxjs-interop"
import { FormControl } from "@angular/forms"

import { debounceTime, distinctUntilChanged, map, Observable, startWith } from "rxjs"

import { isEqual } from "lodash"

import { isFalsy } from "../util"

export interface ObservableOptions {
    distinct?: boolean
    destruct?: boolean
}

export interface ObservableValueOptions extends ObservableOptions {
    debounce?: number
    falsyToNull?: boolean
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

export const DEFAULT: ObservableOptions = { distinct: true, destruct: true }
export const VALUE_DEFAULT: ObservableValueOptions = { ...DEFAULT, falsyToNull: true }

export function fcObservableValue<T, O extends ObservableValueOptions>(
    fc: FormControl<T>,
    opts: O = VALUE_DEFAULT as any
): Observable<O extends { falsyToNull: true } ? T | null : T> {
    let result: Observable<any> = fc.valueChanges.pipe(
        startWith(null),
        map(() => fc.value)
    )

    if (opts.debounce) {
        result = result.pipe(debounceTime(opts.debounce))
    }

    if (opts.falsyToNull) {
        result = result.pipe(map(v => (isFalsy(v) ? null : v)))
    }

    return handleCommonOptions(result, opts) as any
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
