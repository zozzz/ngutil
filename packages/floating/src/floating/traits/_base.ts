import { Observable } from "rxjs"

import type { FloatingRef } from "../floating-ref"

export interface FloatingTrait<T = any> {
    readonly name: string

    connect(floatingRef: FloatingRef<any>): Observable<T>
}
