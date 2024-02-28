import { Injectable } from "@angular/core"

import { map, shareReplay } from "rxjs"

import { watchMedia } from "./media-watcher"

@Injectable({ providedIn: "root" })
export class ColorSchemeService {
    readonly isDark = watchMedia("(prefers-color-scheme: dark)")
    readonly isLight = this.isDark.pipe(
        map(v => !v),
        shareReplay(1)
    )

    // TODO: set preferred color scheme (dark/light)
}
