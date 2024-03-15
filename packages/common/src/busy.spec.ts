import { AsyncPipe } from "@angular/common"
import { Component, inject } from "@angular/core"
import { ComponentFixture, TestBed } from "@angular/core/testing"

import { Busy, BusyTracker } from "./busy"

@Component({
    standalone: true,
    selector: "busy-child",
    imports: [AsyncPipe],
    template: `
        @if (busy) {
            @if (busy.isBusy()) {
                {{ busy.name() }} is busy
            } @else {
                {{ busy.name() }} is free
            }

            @if (busy.isOthersBusy()) {
                {{ busy.name() }} is disabled
            } @else {
                {{ busy.name() }} is enabled
            }

            @if (busy.progress(); as prog) {
                {{ busy.name() }} total: {{ prog.total }} - current: {{ prog.current }}
            }
        } @else {
            unknown is free
        }
    `
})
class ChildComponent {
    readonly busy = inject(Busy, { optional: true })
}

@Component({
    standalone: true,
    selector: "busy-child-list",
    providers: [BusyTracker],
    imports: [Busy, ChildComponent],
    template: `
        <busy-child busyName="child1" />
        <busy-child busyName="child2" />
        <busy-child />
    `
})
class ChildListComponent {
    readonly busy = inject(BusyTracker)
}

@Component({
    standalone: true,
    selector: "busy-root",
    providers: [BusyTracker],
    imports: [ChildListComponent],
    template: `<busy-child-list />`
})
class RootComponent {
    readonly busy = inject(BusyTracker)
}

describe("BusyName", () => {
    let cmp!: ComponentFixture<RootComponent>

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [RootComponent]
        }).compileComponents()
        cmp = TestBed.createComponent(RootComponent)
        await cmp.whenStable()
    })
    it("all free", async () => {
        cmp.detectChanges()
        const content = cmp.debugElement.nativeElement.textContent
        expect(content).toContain("child1 is free")
        expect(content).toContain("child1 is enabled")
        expect(content).toContain("child2 is free")
        expect(content).toContain("child2 is enabled")
        expect(content).toContain("unknown is free")
    })
    it("child1 busy", async () => {
        cmp.componentInstance.busy.set("child1", true)
        cmp.detectChanges()
        const content = cmp.debugElement.nativeElement.textContent
        expect(content).toContain("child1 is busy")
        expect(content).toContain("child1 is enabled")
        expect(content).toContain("child2 is free")
        expect(content).toContain("child2 is disabled")
        expect(content).toContain("unknown is free")
    })
    it("child1 progress", async () => {
        cmp.componentInstance.busy.set("child1", true, { total: 100, current: 50 })
        cmp.detectChanges()
        const content = cmp.debugElement.nativeElement.textContent
        expect(content).toContain("child1 is busy")
        expect(content).toContain("child1 is enabled")
        expect(content).toContain("child1 total: 100 - current: 50")
        expect(content).toContain("child2 is free")
        expect(content).toContain("child2 is disabled")
        expect(content).not.toContain("child2 total: 100 - current: 50")
        expect(content).toContain("unknown is free")
    })
})
