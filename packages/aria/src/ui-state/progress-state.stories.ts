/* eslint-disable max-len */
import { Meta, moduleMetadata, StoryObj } from "@storybook/angular"

import { AsyncPipe } from "@angular/common"
import { Component, inject, input } from "@angular/core"
import { takeUntilDestroyed } from "@angular/core/rxjs-interop"

import { sampleTime, shareReplay } from "rxjs"

import { ProgressSegmentRef, ProgressState } from "./progress-state"

@Component({
    selector: "progress-bar",
    styles: [
        `
            :host {
                position: relative;
                background: #ccc;
                height: 30px;

                .indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    bottom: 0;
                    background: #333;
                    display: grid;
                }
            }
        `
    ],
    template: `<div class="progress"><div class="indicator" [style.width.%]="percent() * 100"></div></div>`
})
class ProgressBar {
    readonly percent = input()
}

@Component({
    selector: "progress-test",
    imports: [AsyncPipe, ProgressBar],
    providers: [ProgressState],
    styles: `
        :host {
            display: grid;
            grid-template-columns: max-content 1fr;
            grid-template-rows: auto;
            row-gap: 14px;
            column-gap: 14px;
        }
    `,
    template: `
        <div>parent:</div>
        <progress-bar [percent]="self.percent$ | async" />

        <div>bar1:</div>
        <progress-bar [percent]="bar1.percent$ | async" />

        <div>bar2:</div>
        <progress-bar [percent]="b2percent | async" />
    `
})
class ProgressTest {
    readonly self = inject(ProgressState)
    readonly bar1 = new ProgressState()
    readonly bar2 = new ProgressState()

    readonly b2percent = this.bar2.percent$.pipe(sampleTime(200), shareReplay(1))

    constructor() {
        const bar1s1 = this.bar1.segment("s1", 1)
        const bar1s2 = this.bar1.segment("s2", 0.7)
        const bar2s1 = this.bar2.segment("s3")

        this.self.connect(this.bar1, "bar1").pipe(takeUntilDestroyed()).subscribe()
        this.self.connect(this.bar2, "bar2").pipe(takeUntilDestroyed()).subscribe()

        this.#infinite(percent => bar1s1.next({ type: "fix", percent }), 0.3)
        this.#infinite(percent => bar1s2.next({ type: "fix", percent }), 0.2)

        setInterval(() => {
            this.#infinite(percent => bar1s1.next({ type: "fix", percent }), 0.4)
        }, 3000)

        bar2s1.next({ type: "lax", predictedTime: 1000 })
        setInterval(() => {
            // bar2s1.next({ type: "lax", predictedTime: 500 })
            bar2s1.complete()
        }, 2000)
        // this.#infinite(percent => bar2s1.next({ type: "lax", predictedTime: 1000 }), 0.3)
    }

    #infinite(cb: (percent: number) => void, increment: number) {
        let percent = 0
        const emit = () => {
            cb(percent)
            if (percent < 1) {
                percent += increment
                setTimeout(emit, 1000 * increment)
            }
        }
        emit()
    }
}

@Component({
    selector: "manual-increment",
    imports: [ProgressBar],
    styles: [
        `
            :host {
                display: grid;
                grid-template-columns: 1fr;
                grid-template-rows: auto;
                row-gap: 14px;
                column-gap: 14px;

                .buttons {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 14px;
                }
            }
        `
    ],
    template: `
        <div>Progress: {{ prog.percent() * 100 }}%</div>
        <progress-bar [percent]="prog.percent()" />

        <b>Segment 1</b>
        <div class="buttons">
            <button (click)="inc(segment1, 0.1)">+10%</button>
            <button (click)="inc(segment1, 0.2)">+20%</button>
            <button (click)="inc(segment1, 0.3)">+30%</button>
            <button (click)="inc(segment1, 1)">DONE</button>
        </div>

        <b>Segment 2</b>
        <div class="buttons">
            <button (click)="inc(segment2, 0.1)">+10%</button>
            <button (click)="inc(segment2, 0.2)">+20%</button>
            <button (click)="inc(segment2, 0.3)">+30%</button>
            <button (click)="inc(segment2, 1)">DONE</button>
        </div>
    `
})
class ManualIncrement {
    readonly prog = new ProgressState()
    readonly segment1 = this.prog.segment("s1")
    readonly segment2 = this.prog.segment("s2")

    inc(segment: ProgressSegmentRef, percent: number) {
        if (segment.value) {
            if (percent >= 1) {
                segment.complete()
            } else if (segment.value.type === "fix") {
                segment.next({ type: "fix", percent: Math.min(1, segment.value.percent + percent) })
            }
        } else {
            segment.next({ type: "fix", percent })
        }
    }
}

export default {
    title: "UI State",
    // component: ProgressTest,
    component: ManualIncrement,
    decorators: [moduleMetadata({ imports: [] })]
} as Meta<ManualIncrement>

type Story = StoryObj<ManualIncrement>

export const Progress: Story = {}
