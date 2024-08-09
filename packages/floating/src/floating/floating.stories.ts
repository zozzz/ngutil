/* eslint-disable max-len */
import { applicationConfig, Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { Component, inject } from "@angular/core"
import { provideAnimations } from "@angular/platform-browser/animations"

import { IndividualLayer } from "../layer/layer.service"
import { FloatingRef } from "./floating-ref"
import { FloatingService } from "./floating.service"
import { backdrop } from "./traits/backdrop"
import { focusTrap } from "./traits/focus-trap"
import { modal } from "./traits/modal"
import { style } from "./traits/style"

@Component({
    selector: "floating-cmp",
    standalone: true,
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
}

@Component({
    standalone: true,
    selector: "floatings",
    imports: [FloatingCmp],
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
    `
})
class Floatings {
    readonly #floating = inject(FloatingService)
    showDialog() {
        this.#floating
            .from(FloatingCmp, {})
            .position({})
            .trait(backdrop({ type: "solid", color: "rgba(0, 0, 0, .5)", closeOnClick: true }), focusTrap())
            .subscribe()
    }

    showModal() {
        this.#floating
            .from(FloatingCmp, {})
            .trait(modal({ closeOnBackdropClick: true }), style({ borderRadius: "3px" }))
            .subscribe()
    }
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
