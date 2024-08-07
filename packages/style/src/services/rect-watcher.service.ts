import { inject, Injectable } from "@angular/core"

import { combineLatest, Observable, shareReplay, Subscriber } from "rxjs"

import { ElementInput } from "@ngutil/common"

import { Rect } from "../util/rect"
import { DimensionWatcher, WatchBox } from "./dimension-watcher.service"
import { PositionWatcher } from "./position-watcher.service"

@Injectable({ providedIn: "root" })
export class RectWatcher {
    readonly #dimWatcher = inject(DimensionWatcher)
    readonly #posWatcher = inject(PositionWatcher)

    watch(element: ElementInput | Window, watchBox: WatchBox): Observable<Rect> {
        return new Observable((dest: Subscriber<Rect>) =>
            combineLatest({
                dim: this.#dimWatcher.watch(element, watchBox),
                pos: this.#posWatcher.watch(element)
            }).subscribe(({ dim, pos }) => {
                dest.next({
                    x: pos.x,
                    y: pos.y,
                    width: dim.width,
                    height: dim.height
                })
            })
        ).pipe(shareReplay(1))
    }
}
