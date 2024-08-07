import { ElementRef, Injectable } from "@angular/core"

import { Observable, of } from "rxjs"

import { coerceElement } from "@ngutil/common"

export interface CoverOptions {
    container: HTMLElement | ElementRef<HTMLElement>
    color: string
}

export interface SolidCoverOptions extends CoverOptions {}

export interface CropCoverOptions extends CoverOptions {
    /**
     * Element that will be interactive while the cover is visible
     */
    crop: Node | ElementRef<Node>
}

export interface RevealCoverOptions extends CoverOptions {
    /**
     * Left and right coordinates inside the container
     */
    origin: { left: number; top: number }
}

@Injectable({ providedIn: "root" })
export class CoverService {
    solid(options: SolidCoverOptions) {
        coerceElement(options.container)
    }

    crop(options: CropCoverOptions) {}

    reveal(options: RevealCoverOptions): Observable<void> {
        return of()
    }
}
