import { Observable } from "rxjs"

/**
 * @example
 * ```ts
 * class Busy implements ConnectProtocol {
 *     connect(ob: Observable<any>): Observable<any> {
 *         return new Observable(s => {
 *             const sub = this.doSomething().subscribe(s)
 *             return sub.unsubscribe.bind(sub)
 *         })
 *     }
 * }
 * ```
 */
export interface ConnectProtocol {
    /**
     * @returns When the observable is unsubscribed, the connect method cleans up everything
     */
    connect(...args: any[]): Observable<unknown>
}
