import { takeUntil } from "rxjs"

import { CoverRef } from "@ngutil/graphics"
import { CoverOptions } from "@ngutil/graphics"

import { ChildRef } from "./child-ref"

export type BackdropOptions = CoverOptions

export class BackdropRef extends ChildRef {
    readonly group: string

    set visible(visible: boolean) {
        if (this.#visible !== visible) {
            this.#visible = visible
            this.nativeElement.style.visibility = visible ? "visible" : "hidden"
        }
    }

    get visible(): boolean {
        return this.#visible
    }
    #visible: boolean = false

    constructor(
        readonly coverRef: CoverRef<any>,
        readonly under: ChildRef,
        readonly options: CoverOptions
    ) {
        super(coverRef.nativeElement)

        this.group = `${options.color === "transparent" ? "transparent" : "solid"}`

        this.state.on("showing", () => {
            this.coverRef
                .show()
                .pipe(takeUntil(this.state.onDone("disposed")))
                .subscribe(() => {
                    this.visible = true
                })
        })
    }

    show() {
        return this.state.run("showing", "shown")
    }
}
