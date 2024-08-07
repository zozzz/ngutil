import { Observable } from "rxjs"

export abstract class FloatingTrait<T = any> {
    abstract readonly name: string

    abstract connect(...args: any[]): Observable<T>
}
