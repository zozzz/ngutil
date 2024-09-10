import { animate, state, style, transition, trigger } from "@angular/animations"
import { CommonModule } from "@angular/common"
import { Component, computed, contentChildren, effect, input, output, signal } from "@angular/core"

import { clamp } from "lodash"

import { Duration, Ease } from "@ngutil/style"

import { ItemAnimationState, SlidingItemComponent } from "./sliding-item.component"
import { SlidingItemDirective } from "./sliding-item.directive"

const absolute = { position: "absolute", top: "0px", left: "0px" }

const anim = `${Duration.Fast} ${Ease.Acceleration}`

@Component({
    selector: "nu-sliding",
    standalone: true,
    imports: [CommonModule, SlidingItemComponent],
    styleUrl: "./sliding.component.scss",
    animations: [
        trigger("animate", [
            state(ItemAnimationState.FastOut, style({ display: "none", ...absolute, transform: "translateX(-100%)" })),
            state(ItemAnimationState.LeftOut, style({ display: "none", ...absolute, transform: "translateX(-100%)" })),
            state(ItemAnimationState.RightOut, style({ display: "none", ...absolute, transform: "translateX(100%)" })),
            state(ItemAnimationState.FastIn, style({ display: "", position: "relative", transform: "translateX(0)" })),
            state(ItemAnimationState.LeftIn, style({ display: "", position: "relative", transform: "translateX(0)" })),
            state(ItemAnimationState.RightIn, style({ display: "", position: "relative", transform: "translateX(0)" })),

            transition(`* => ${ItemAnimationState.LeftOut}`, [
                style({ width: "*", ...absolute, transform: "translateX(0)" }),
                animate(anim, style({ transform: "translateX(-100%)" }))
            ]),
            transition(`* => ${ItemAnimationState.RightOut}`, [
                style({ width: "*", ...absolute, transform: "translateX(0)" }),
                animate(anim, style({ transform: "translateX(100%)" }))
            ]),
            transition(`* => ${ItemAnimationState.LeftIn}`, [
                style({ display: "", position: "relative", transform: "translateX(-100%)" }),
                animate(anim, style({ transform: "translateX(0)" }))
            ]),
            transition(`* => ${ItemAnimationState.RightIn}`, [
                style({ display: "", position: "relative", transform: "translateX(100%)" }),
                animate(anim, style({ transform: "translateX(0%)" }))
            ])
        ])
    ],
    template: `
        @if (items(); as _items) {
            @for (item of _items; track item; let index = $index) {
                @if (item.rendered()) {
                    <nu-sliding-item [@animate]="item.animation()">
                        <ng-template [ngTemplateOutlet]="item.tpl" />
                    </nu-sliding-item>
                }
            }
        }
    `
})
export class SlidingComponent {
    /**
     * List of items
     */
    readonly items = contentChildren(SlidingItemDirective)

    /**
     * Lazily rendering items
     */
    readonly lazy = input(true)

    /**
     * Index of the preferred item
     */
    readonly preferred = signal(0)

    /**
     * Index of the active item
     */
    readonly active = computed(() => {
        const items = this.items()
        if (items.length === 0) {
            return -1
        }
        const index = this.preferred()
        return clamp(index, 0, items.length - 1)
    })

    /**
     * Changes of the active item
     */
    readonly changes = output<SlidingComponent>()

    constructor() {
        effect(
            () => {
                const activeIndex = this.active()
                const items = this.items()
                const lazy = this.lazy()
                const preferred = this.preferred()
                const currentActiveIndex = items.findIndex(item => item.active())
                if (activeIndex === currentActiveIndex) {
                    if (items[activeIndex]?.active()) {
                        return
                    }
                }

                let activeItem: SlidingItemDirective | undefined
                let inAnimation: ItemAnimationState | null = null

                for (let i = 0; i < items.length; i++) {
                    const item = items[i]
                    const isActive = i === activeIndex

                    if (isActive) {
                        activeItem = item
                    } else {
                        const currentlyActive = item.active()
                        item.active.set(false)

                        if (lazy === false && !item.rendered()) {
                            item.rendered.set(true)
                        }

                        if (item.animation() || item.rendered()) {
                            if (currentlyActive) {
                                if (activeIndex < currentActiveIndex) {
                                    item.animation.set(ItemAnimationState.RightOut)
                                    inAnimation = ItemAnimationState.LeftIn
                                } else {
                                    item.animation.set(ItemAnimationState.LeftOut)
                                    inAnimation = ItemAnimationState.RightIn
                                }
                            } else {
                                item.animation.set(ItemAnimationState.FastOut)
                            }
                        }
                    }
                }

                if (activeItem) {
                    if (inAnimation) {
                        activeItem.animation.set(inAnimation)
                    } else if (items.length === 1) {
                        activeItem.animation.set(ItemAnimationState.FastIn)
                    } else if (activeIndex < currentActiveIndex) {
                        activeItem.animation.set(ItemAnimationState.LeftIn)
                    } else {
                        activeItem.animation.set(ItemAnimationState.RightIn)
                    }
                    activeItem.active.set(true)
                    activeItem.rendered.set(true)
                }

                const preferredClamp = clamp(preferred, 0, items.length - 1)
                if (preferred !== preferredClamp) {
                    this.preferred.set(preferredClamp)
                }

                this.changes.emit(this)
            },
            { allowSignalWrites: true }
        )
    }
}
