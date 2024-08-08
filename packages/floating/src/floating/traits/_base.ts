import { Observable } from "rxjs"

import type { FloatingRef } from "../floating-ref"

export abstract class FloatingTrait<T = any> {
    abstract readonly name: string

    abstract connect(floatingRef: FloatingRef<any>): Observable<T>
}
