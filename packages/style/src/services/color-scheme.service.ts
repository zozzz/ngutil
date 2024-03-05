import { inject, Injectable } from "@angular/core"

import { map, Observable, shareReplay } from "rxjs"

import { MediaWatcher } from "./media-watcher.service"

@Injectable({ providedIn: "root" })
export class ColorSchemeService {
    readonly #mq = inject(MediaWatcher)
    readonly isDark: Observable<boolean> = this.#mq.watch("(prefers-color-scheme: dark)")
    readonly isLight = this.isDark.pipe(
        map(v => !v),
        shareReplay(1)
    )

    // TODO: set preferred color scheme (dark/light)
}
