import { AnimationBuilder, AnimationMetadata, AnimationOptions } from "@angular/animations"

import { Observable, Subscriber } from "rxjs"

import { coerceElement, ElementInput } from "@ngutil/common"

export interface AnimationObservableParams {
    builder: AnimationBuilder
    animation: AnimationMetadata | AnimationMetadata[]
    element: ElementInput
    options?: AnimationOptions
}

export function animationObservable({ builder, animation, element, options }: AnimationObservableParams) {
    return new Observable((dst: Subscriber<void>) => {
        const factory = builder.build(animation)
        const player = factory.create(coerceElement(element), options)

        const done = () => {
            dst.next()
            dst.complete()
        }

        player.onDestroy(done)
        player.onDone(done)
        player.play()

        return () => {
            player.destroy()
        }
    })
}
