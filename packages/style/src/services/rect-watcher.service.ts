import { inject, Injectable } from "@angular/core"

import { combineLatest, map, Observable, Subscriber } from "rxjs"

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
            })
                .pipe(
                    map(({ dim, pos }) => {
                        return { ...dim, ...pos }
                    })
                )
                .subscribe(dest)
        )
    }
}
