import { Injectable } from "@angular/core"

import { Observable, of } from "rxjs"

import { coerceElement, ElementInput } from "@ngutil/common"
import { Rect } from "@ngutil/style"

export interface CoverOptions {
    container: ElementInput
    color: "transparent" | string
}

export interface SolidCoverOptions extends CoverOptions {}

export interface CropCoverOptions extends CoverOptions {
    /**
     * Element that will be interactive while the cover is visible
     */
    crop: ElementInput | Observable<Rect>
}

export interface RevealCoverOptions extends CoverOptions {
    /**
     * Left and right coordinates inside the container
     */
    origin: { left: number; top: number }
}

@Injectable({ providedIn: "root" })
export class CoverService {
    solid(options: SolidCoverOptions): Observable<HTMLDivElement> {
        return new Observable(dest => {
            const container = coerceElement(options.container)
            const cover = this.#createElement(options)
            container.appendChild(cover)
            dest.next(cover)

            return () => {
                cover.parentElement?.removeChild(cover)
            }
        })
    }

    crop(options: CropCoverOptions): Observable<HTMLDivElement> {
        return of()
    }

    reveal(options: RevealCoverOptions): Observable<HTMLDivElement> {
        return of()
    }

    #createElement(options: CoverOptions) {
        const el = document.createElement("div")
        el.style.position = "absolute"
        el.style.top = el.style.right = el.style.bottom = el.style.left = "0px"

        if (options.color === "transparent") {
            el.style.backgroundColor = "rgba(255, 255, 255, 0.0001)"
        } else {
            el.style.backgroundColor = options.color
        }

        return el
    }
}
