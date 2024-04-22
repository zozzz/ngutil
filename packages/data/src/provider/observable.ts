import type { Observable } from "rxjs"

import type { Model, ModelMetaInput } from "../model"
import { LocalProvider } from "./local"

export class ObservableProvider<T extends Model> extends LocalProvider<T> {
    readonly items$: Observable<readonly T[]>

    constructor(meta: ModelMetaInput<T>, src: Observable<readonly T[]>) {
        super(meta)
        this.items$ = src
    }
}
