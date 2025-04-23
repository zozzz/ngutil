/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { DOCUMENT } from "@angular/common"
import { Component, computed, Directive, effect, ElementRef, inject, input } from "@angular/core"

import { GestureEvent } from "./gesture"
import { GestureDrag, gestureDrag, GestureDragHorizontal, GestureDragVertical } from "./gesture-drag"
import { GesturePointerType } from "./gesture-event"
import { GestureLongTap } from "./gesture-longtap"
import { GestureTap } from "./gesture-tap"
import { GestureService } from "./gesture.service"

type DraggableType = "any" | "horizontal" | "vertical" | "mouse"

const DraggingMouse = gestureDrag({ pointerTypes: [GesturePointerType.Mouse] })

@Directive({
    selector: "[nuDraggable]"
})
class Draggable {
    readonly #el = inject(ElementRef)
    readonly #svc = inject(GestureService)

    readonly dtype = input.required<DraggableType>({ alias: "nuDraggable" })
    readonly dragGesture = computed(() => {
        const dtype = this.dtype()
        switch (dtype) {
            case "any":
                return GestureDrag
            case "horizontal":
                return GestureDragHorizontal
            case "vertical":
                return GestureDragVertical
            case "mouse":
                return DraggingMouse
        }
    })

    constructor() {
        effect(() => {
            const dgesture = this.dragGesture()

            this.#svc.listen(this.#el, dgesture, GestureLongTap, GestureTap).subscribe(event => {
                // console.log("RESULT", event)
                if (event.type === "gesture-drag") {
                    const { phase, target, moveBy } = event.detail

                    if (phase === "end") {
                        Object.assign(target.style, {
                            transform: "translate(0px, 0px)",
                            background: "transparent"
                        })
                    } else {
                        // const rect = target.getBoundingClientRect()
                        Object.assign(target.style, {
                            transform: `translate(${moveBy.x}px, ${moveBy.y}px)`,
                            background: "red"
                        })
                    }
                } else if (event.type === "gesture-tap") {
                    const detail = event.detail
                } else if (event.type === "gesture-longtap") {
                    const detail = event.detail
                }
            })

            this.#svc.listen(this.#el, dgesture, GestureLongTap, GestureTap).subscribe()
        })
    }
}

@Component({
    selector: "gesture-test",

    imports: [Draggable],
    styles: `
        :host {
            display: block;
            padding: 4px;
            margin: 4px;

            .garea {
                border-radius: 3px;
                border: 1px solid #ccc;
                width: 100px;
                height: 100px;
                margin: 14px;
                display: flex;
                justify-content: center;
                align-items: center;
                user-select: none;
                position: "relative";
            }
        }
    `,
    template: `
        <!-- <button (click)="destroy.next()">DESTROY</button> -->
        <div class="garea" nuDraggable="any">DRAG ANY</div>
        <div class="garea" nuDraggable="horizontal">DRAG HORIZONTAL</div>
        <div class="garea" nuDraggable="vertical">DRAG VERTICAL</div>
        <div class="garea" nuDraggable="mouse">DRAG MOUSE ONLY</div>
        <button (click)="onClick($event)">SIMPLE BUTTON</button>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
    `
})
class GestureTest {
    readonly #doc = inject(DOCUMENT)
    readonly #el = inject(ElementRef)

    constructor() {
        const xx = ["gesture-drag", "gesture-tap", "gesture-longtap"]

        for (const x of xx) {
            this.#el.nativeElement.addEventListener(x, (e: GestureEvent<any>) => {
                // console.log(e.type, e.detail.phase, `prevented = ${e.defaultPrevented}`)
            })
        }
    }

    onClick(event: Event) {
        console.log("CLICK", event)
    }
}

export default {
    title: "Gestures",
    component: GestureTest,
    decorators: [moduleMetadata({ imports: [], providers: [GestureService] })]
    // parameters: {
    //     layout: "fullscreen",
    //     controls: { include: [] }
    // },
    // render: (args: FocusableComponent) => {
    //     const content = args.content
    //     delete args.content
    //     return {
    //         props: {
    //             ...args
    //         },
    //         template: `<nu-story-slot ${argsToTemplate(args)}>${content || ""}</nu-story-slot>`
    //     }
    // }
} as Meta<GestureTest>

type Story = StoryObj<GestureTest>

export const Simple: Story = {}
