import { animate, AnimationBuilder, AnimationMetadata, style } from "@angular/animations"

import { Observable, Subscriber } from "rxjs"

import { animationObservable } from "@ngutil/graphics"
import { Duration, Ease } from "@ngutil/style"

import { FloatingRef } from "../floating-ref"
import { FloatingTrait } from "./_base"

export type AnimationSet = { show: AnimationMetadata[]; hide: AnimationMetadata[] }

// https://tympanus.net/Development/ModalWindowEffects/

const transitionDuration = Duration.FastMs

export class AnimationTrait implements FloatingTrait<unknown> {
    readonly name = "animation"

    constructor(readonly animation: AnimationSet) {}

    connect(floatingRef: FloatingRef): Observable<unknown> {
        return new Observable((dst: Subscriber<unknown>) => {
            const builder = floatingRef.container.injector.get(AnimationBuilder)
            const element = floatingRef.container.nativeElement
            floatingRef.state.on("showing", () =>
                animationObservable({ builder, element, animation: this.animation.show })
            )
            floatingRef.state.on("disposing", () =>
                animationObservable({ builder, element, animation: this.animation.hide })
            )
            dst.next()
        })
    }
}

export const FallAnimation: AnimationSet = {
    show: [
        style({
            // "perspective:": "1300px",
            transform: "scale(1.5)",
            visibility: "visible",
            opacity: "0"
        }),
        animate(
            `${transitionDuration}ms ${Ease.Deceleration}`,
            style({
                transform: "scale(1)",
                opacity: "1"
            })
        )
    ],
    hide: [
        animate(
            `${transitionDuration}ms ${Ease.Deceleration}`,
            style({
                transform: "scale(1.5)",
                visibility: "visible",
                opacity: "0"
            })
        )
    ]
}

export function fallAnimation() {
    return new AnimationTrait(FallAnimation)
}

export const FadeAnimation: AnimationSet = {
    show: [style({ opacity: 0 }), animate(`${transitionDuration}ms ${Ease.Deceleration}`, style({ opacity: 1 }))],
    hide: [animate(`${transitionDuration}ms ${Ease.Deceleration}`, style({ opacity: 0 }))]
}

export function fadeAnimation() {
    return new AnimationTrait(FadeAnimation)
}
