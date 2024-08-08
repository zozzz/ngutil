import { Injector } from "@angular/core"

import { Subscription } from "rxjs"

import { CoverService } from "@ngutil/graphics"
import { CoverOptions, CropCoverOptions } from "@ngutil/graphics"

import { ChildRef } from "./child-ref"

export interface BasicBackdropOptions {
    under: ChildRef
    color: CoverOptions["color"]
}

export interface SolidBackdropOptions extends BasicBackdropOptions {
    type: "solid"
}

export interface CropBackdropOptions extends BasicBackdropOptions {
    type: "crop"
    crop: CropCoverOptions["crop"]
}

export type BackdropOptions = SolidBackdropOptions | CropBackdropOptions

export class BackdropRef extends ChildRef {
    static from(cover: CoverService, injector: Injector, options: BackdropOptions): BackdropRef {
        const ref = new BackdropRef(document.createElement("div"), cover, injector, options)
        // TODO: kérdéses
        // options.under.state.control(ref.state)
        return ref
    }

    readonly #coverSub?: Subscription
    readonly under: ChildRef
    readonly group?: string

    set visible(visible: boolean) {
        if (this.#visible !== visible) {
            this.#visible = visible
            this.nativeElement.style.visibility = visible ? "visible" : "hidden"
        }
    }

    get visible(): boolean {
        return this.#visible
    }
    #visible: boolean = true

    constructor(
        nativeElement: HTMLElement,
        readonly coverSvc: CoverService,
        readonly injector: Injector,
        readonly options: BackdropOptions
    ) {
        super(nativeElement)
        nativeElement.style.position = "absolute"
        nativeElement.style.top =
            nativeElement.style.right =
            nativeElement.style.bottom =
            nativeElement.style.left =
                "0px"

        this.under = options.under

        if (options.type === "solid") {
            this.#coverSub = this.coverSvc.solid({ container: nativeElement, color: options.color }).subscribe()
            this.group = `${options.color === "transparent" ? "transparent" : "solid"}`
        } else if (options.type === "crop") {
            this.#coverSub = this.coverSvc
                .crop({ container: nativeElement, color: options.color, crop: options.crop })
                .subscribe()
        }
    }

    show() {
        return this.state.run(["showing", "shown"])
    }

    protected override destroy(): void {
        this.#coverSub?.unsubscribe()
        super.destroy()
    }
}
