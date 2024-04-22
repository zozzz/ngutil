import { type Observable, of } from "rxjs"

import type { Model, ModelMetaInput } from "../model"
import { LocalProvider } from "./local"

export class ArrayProvider<T extends Model> extends LocalProvider<T> {
    override readonly items$: Observable<readonly T[]>

    constructor(meta: ModelMetaInput<T>, items: readonly T[]) {
        super(meta)
        this.items$ = of(items)
    }
}
