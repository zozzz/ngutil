import { AnimationBuilder } from "@angular/animations"

import { exhaustMap, map, Observable, Subject, Subscriber } from "rxjs"

import { animationObservable } from "@ngutil/graphics"

import type { BackdropOptions, BackdropRef, CropBackdropOptions } from "../../layer/backdrop-ref"
import { type FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"
import { FadeAnimation } from "./animation"
import { FloatingPosition } from "./position"

export interface BackdropTraitOptions {
    type: BackdropOptions["type"]
    color: BackdropOptions["color"]
    closeOnClick?: boolean
    // TODO: maybe cropMargin
}

export class BackdropState {
    onClick: Observable<void> = new Subject<void>()
}

export class BackdropTrait extends FloatingTrait<BackdropState> {
    override name = "backdrop"

    constructor(readonly options: BackdropTraitOptions) {
        super()
    }

    override connect(floatingRef: FloatingRef<any>): Observable<BackdropState> {
        return new Observable((dest: Subscriber<BackdropState>) => {
            const animationBuilder = floatingRef.container.injector.get(AnimationBuilder)
            const options: BackdropOptions = {
                type: this.options.type,
                under: floatingRef.container,
                color: this.options.color
            } as any

            if (this.options.type === "crop") {
                ;(options as CropBackdropOptions).crop = floatingRef
                    .watchTrait<FloatingPosition>("position")
                    .pipe(map(position => position.anchor))
            }

            const state = new BackdropState()
            const backdrop = floatingRef.layerSvc.newBackdrop(options)
            const removeOnClick = this.options.closeOnClick
                ? this.#installClickHandler(floatingRef, backdrop, state)
                : null

            const onClickSub = this.options.closeOnClick
                ? state.onClick.pipe(exhaustMap(() => floatingRef.close())).subscribe()
                : null

            backdrop.state.on("showing", () =>
                animationObservable({
                    builder: animationBuilder,
                    element: backdrop.nativeElement,
                    animation: FadeAnimation.show
                })
            )
            backdrop.state.on("disposing", () =>
                animationObservable({
                    builder: animationBuilder,
                    element: backdrop.nativeElement,
                    animation: FadeAnimation.hide
                })
            )

            floatingRef.state.on("disposing", () => backdrop.dispose())

            const backdropShowSub = backdrop.show().subscribe()
            dest.next(state)

            return () => {
                removeOnClick && removeOnClick()
                onClickSub?.unsubscribe()
                backdropShowSub.unsubscribe()
            }
        })
    }

    #installClickHandler(floatingRef: FloatingRef<any>, backdrop: BackdropRef, state: BackdropState) {
        const handler = (event: MouseEvent) => {
            if (event.defaultPrevented) {
                return
            }

            if (event.target === backdrop.nativeElement || backdrop.nativeElement.contains(event.target as Node)) {
                ;(state.onClick as Subject<void>).next()
            }
        }

        document.addEventListener("click", handler)

        return () => {
            document.removeEventListener("click", handler)
        }
    }
}

export function backdrop(options: BackdropTraitOptions) {
    return new BackdropTrait(options)
}
