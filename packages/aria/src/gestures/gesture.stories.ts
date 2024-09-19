/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { Component, effect, ElementRef, inject, viewChild } from "@angular/core"

import { Subject, takeUntil } from "rxjs"

import { Dragging } from "./gestures"
import { GesturesService } from "./gestures.service"

@Component({
    standalone: true,
    selector: "gesture-test",
    providers: [GesturesService],
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
        <button (click)="destroy.next()">DESTROY</button>
        <div #drag class="garea">DRAG1</div>
        <div #drag2 class="garea">DRAG2</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
        <div class="garea">SOMETHING</div>
    `
})
class GestureTest {
    readonly #svc = inject(GesturesService)

    readonly drag = viewChild("drag", { read: ElementRef })
    readonly destroy = new Subject()

    constructor() {
        effect(() => {
            const drag = this.drag()
            if (!drag) {
                return
            }

            this.#svc
                .watch(drag, Dragging)
                .pipe(takeUntil(this.destroy))
                .subscribe(dragEvent => {
                    // console.log(dragEvent)
                    const target = dragEvent.target

                    if (dragEvent.phase === "end") {
                        Object.assign(target.style, {
                            transform: "translate(0px, 0px)",
                            background: "transparent"
                        })
                    } else {
                        // const rect = target.getBoundingClientRect()
                        Object.assign(target.style, {
                            transform: `translate(${dragEvent.pointers[0].distance.x}px, ${dragEvent.pointers[0].distance.y}px)`,
                            background: "red"
                        })
                    }
                })
        })
    }
}

export default {
    title: "Gestures",
    component: GestureTest,
    decorators: [moduleMetadata({ imports: [] })]
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
