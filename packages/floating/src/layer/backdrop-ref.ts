import { ElementRef, Injector } from "@angular/core"

import { CoverService } from "@ngutil/graphics"

import { ChildRef } from "./child-ref"

export type BackdropColor = "transparent" | string

export interface BasicBackdropOptions {
    under: ChildRef
    color?: BackdropColor
}

export interface SolidBackdropOptions extends BasicBackdropOptions {
    type: "solid"
}

export interface CropBackdropOptions extends BasicBackdropOptions {
    type: "crop"
    crop: Node | ElementRef<Node>
}

export type BackdropOptions = SolidBackdropOptions | CropBackdropOptions

export class BackdropRef extends ChildRef {
    static from(cover: CoverService, options: BackdropOptions, injector: Injector): BackdropRef {
        const ref = new BackdropRef(document.createElement("div"), options.under, injector)
        options.under.state.control(ref.state)
        return ref
    }

    constructor(
        nativeElement: HTMLElement,
        readonly under: ChildRef,
        readonly injector: Injector
    ) {
        super(nativeElement)
    }
}
