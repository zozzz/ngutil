/* eslint-disable max-len */
import { applicationConfig, Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { Component, ElementRef, HostListener, inject, input } from "@angular/core"
import { provideAnimations } from "@angular/platform-browser/animations"

import { Focusable, FocusState } from "@ngutil/aria"

import { AlwaysOnTop } from "../layer/child-ref"
import { IndividualLayer } from "../layer/layer.service"
import { FloatingRef } from "./floating-ref"
import { FloatingService } from "./floating.service"
import { fadeAnimation } from "./traits/animation"
import { backdrop } from "./traits/backdrop"
import { minWidth } from "./traits/dim-contraint"
import { focus } from "./traits/focus"
import { modal } from "./traits/modal"
import { position } from "./traits/position"
import { style } from "./traits/style"

@Component({
    selector: ".drop-down-trigger",
    standalone: true,
    hostDirectives: [Focusable],
    template: `
        <ng-content />
        <!-- &nbsp;( origin: {{ focus.origin() }} with: {{ focus.within() }} ) -->
    `
})
class DropDownTrigger {
    readonly floating = inject(FloatingService)
    readonly focus = inject(FocusState)
    readonly el = inject(ElementRef)

    readonly alwaysOnTop = input(AlwaysOnTop.None)

    constructor() {
        // this.focus.event$.pipe(takeUntilDestroyed()).subscribe(console.log)
    }

    @HostListener("click")
    onClick() {
        this.floating
            .from(FloatingCmp, { alwaysOnTop: this.alwaysOnTop() })
            .trait(
                position({
                    anchor: { ref: this.el, align: "bottom left" },
                    content: { align: "top left", margin: 20 }
                }),

                // minWidth(3243524),
                // maxWidth(this.el),
                minWidth(this.el),
                style({ borderRadius: "3px", border: "1px solid black" }),
                fadeAnimation(),
                focus({ connect: this.focus }),
                backdrop({ type: "solid", color: "rgba(0, 0, 0, .5)", closeOnClick: true })
            )
            .subscribe(event => {
                if (event.type === "disposing") {
                    this.el.nativeElement.focus()
                }
                // console.log(event)
            })
    }
}

@Component({
    selector: "floating-cmp",
    standalone: true,
    imports: [DropDownTrigger],
    styles: [
        `
            :host {
                display: block;
                width: 300px;
                padding: 16px;
                background-color: red;
                color: white;
            }
        `
    ],
    template: `
        <div>I'am Floating! yeah :)</div>
        <br />
        <button (click)="close()">close</button>
        <button (click)="newModal()">new modal</button>
        <button (click)="setResult()">set result</button>
        <button class="drop-down-trigger" [alwaysOnTop]="${AlwaysOnTop.Modal}">drop down</button>
        <button class="drop-down-trigger" [alwaysOnTop]="${AlwaysOnTop.UAC}">uac</button>
    `
})
class FloatingCmp {
    readonly floatingRef = inject(FloatingRef)
    readonly #floating = inject(FloatingService)
    close() {
        this.floatingRef.hide().subscribe()
    }

    newModal() {
        this.#floating
            .from(FloatingCmp, {})
            .trait(modal({ closeOnBackdropClick: true }))
            .subscribe()
    }

    setResult() {
        this.floatingRef.setResult("RESULT FROM POPUP")
    }
}

@Component({
    standalone: true,
    selector: "floatings",
    imports: [FloatingCmp, DropDownTrigger],
    providers: [FloatingService],
    hostDirectives: [IndividualLayer],
    styles: [
        `
            :host {
                width: 100vw;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 16px;
            }
        `
    ],
    template: `
        <button (click)="showDialog()">dialog</button>
        <button (click)="showModal()">modal</button>
        <button class="drop-down-trigger" style="width: 300px;">drop down</button>
    `
})
class Floatings {
    readonly #floating = inject(FloatingService)

    showDialog() {
        this.#floating
            .from(FloatingCmp, {})
            .position({})
            .trait(backdrop({ type: "solid", color: "rgba(0, 0, 0, .5)", closeOnClick: true }), focus({ trap: true }))
            .subscribe()
    }

    showModal() {
        this.#floating
            .from(FloatingCmp, {})
            .trait(modal({ closeOnBackdropClick: true }), style({ borderRadius: "3px" }))
            .subscribe(event => {
                console.log(event)
            })
    }

    dropDown() {}
}

export default {
    title: "Floatings",
    component: Floatings,
    decorators: [
        applicationConfig({
            providers: [provideAnimations()]
        }),
        moduleMetadata({ imports: [Floatings] })
    ],
    parameters: {
        layout: "fullscreen",
        controls: { include: [] }
    },
    render: args => {
        return {
            props: {
                ...args
            },
            template: `<floatings></floatings>`
        }
    }
} as Meta

type Story = StoryObj<Floatings>

export const Simple: Story = {}
