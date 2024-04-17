import { AsyncPipe } from "@angular/common"
import { Component, inject, OnDestroy, viewChild } from "@angular/core"
import { ComponentFixture, TestBed } from "@angular/core/testing"
import { By } from "@angular/platform-browser"

import { BehaviorSubject, Subscription } from "rxjs"

import { Busy, BusyTracker } from "./busy"

@Component({
    standalone: true,
    selector: "busy-child",
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
    selector: "busy-connect",
    imports: [AsyncPipe],
    template: `
        @if (busy.isBusy()) {
            [connect:{{ busy.name() }}] is busy
        } @else {
            [connect:{{ busy.name() }}] is free
        }

        @if (busy.isOthersBusy()) {
            is disabled
        } @else {
            is enabled
        }
    `
})
class BusyConnectComponent implements OnDestroy {
    readonly busy = inject(Busy)
    readonly busySource$ = new BehaviorSubject(false)
    readonly subs = new Subscription()

    constructor() {
        this.subs.add(this.busy.connect(this.busySource$).subscribe())
    }

    ngOnDestroy(): void {
        this.subs.unsubscribe()
    }
}

@Component({
    standalone: true,
    selector: "busy-child-list",
    providers: [BusyTracker],
    imports: [Busy, ChildComponent, BusyConnectComponent],
    template: `
        <busy-child nuBusy="child1" />
        <busy-child nuBusy="child2" />
        <busy-child />
        <busy-connect #child3 nuBusy="child3" />
        <busy-child nuBusy="*" />
    `
})
class ChildListComponent {
    readonly busy = inject(BusyTracker)
    readonly child3 = viewChild.required("child3", { read: BusyConnectComponent })
}

@Component({
    standalone: true,
    selector: "busy-root",
    providers: [BusyTracker],
    imports: [ChildListComponent],
    template: `<busy-child-list #childList />`
})
class RootComponent {
    readonly busy = inject(BusyTracker)
    readonly childList = viewChild.required("childList", { read: ChildListComponent })
}

describe("nuBusy", () => {
    let cmp!: ComponentFixture<RootComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RootComponent]
        }).compileComponents()
        cmp = TestBed.createComponent(RootComponent)
        cmp.autoDetectChanges(true)
        await cmp.whenStable()
    })
    it("all free", async () => {
        cmp.detectChanges()

        const child1 = cmp.debugElement.query(By.css("busy-child[nubusy='child1']"))
        expect(child1.nativeElement.textContent).toEqual(" child1 is free  child1 is enabled ")

        const child2 = cmp.debugElement.query(By.css("busy-child[nubusy='child2']"))
        expect(child2.nativeElement.textContent).toEqual(" child2 is free  child2 is enabled ")

        const nobusy = cmp.debugElement.query(By.css("busy-child:not([nubusy])"))
        expect(nobusy.nativeElement.textContent).toEqual(" unknown is free ")

        const connect = cmp.debugElement.query(By.css("busy-connect"))
        expect(connect.nativeElement.textContent).toEqual(" [connect:child3] is free  is enabled ")

        const wildcard = cmp.debugElement.query(By.css("busy-child[nubusy='*']"))
        expect(wildcard.nativeElement.textContent).toEqual(" * is free  * is enabled ")
    })
    it("child1 busy", async () => {
        cmp.componentInstance.busy.set("child1", true)
        cmp.detectChanges()

        const child1 = cmp.debugElement.query(By.css("busy-child[nubusy='child1']"))
        expect(child1.nativeElement.textContent).toEqual(" child1 is busy  child1 is enabled ")

        const child2 = cmp.debugElement.query(By.css("busy-child[nubusy='child2']"))
        expect(child2.nativeElement.textContent).toEqual(" child2 is free  child2 is disabled ")

        const nobusy = cmp.debugElement.query(By.css("busy-child:not([nubusy])"))
        expect(nobusy.nativeElement.textContent).toEqual(" unknown is free ")

        const connect = cmp.debugElement.query(By.css("busy-connect"))
        expect(connect.nativeElement.textContent).toEqual(" [connect:child3] is free  is disabled ")

        const wildcard = cmp.debugElement.query(By.css("busy-child[nubusy='*']"))
        expect(wildcard.nativeElement.textContent).toEqual(" * is busy  * is disabled ")
    })
    it("child1 progress", async () => {
        cmp.componentInstance.busy.set("child1", true, { total: 100, current: 50 })
        cmp.detectChanges()

        const child1 = cmp.debugElement.query(By.css("busy-child[nubusy='child1']"))
        expect(child1.nativeElement.textContent).toEqual(
            " child1 is busy  child1 is enabled  child1 total: 100 - current: 50 "
        )

        const child2 = cmp.debugElement.query(By.css("busy-child[nubusy='child2']"))
        expect(child2.nativeElement.textContent).toEqual(" child2 is free  child2 is disabled ")

        const nobusy = cmp.debugElement.query(By.css("busy-child:not([nubusy])"))
        expect(nobusy.nativeElement.textContent).toEqual(" unknown is free ")

        const connect = cmp.debugElement.query(By.css("busy-connect"))
        expect(connect.nativeElement.textContent).toEqual(" [connect:child3] is free  is disabled ")

        const wildcard = cmp.debugElement.query(By.css("busy-child[nubusy='*']"))
        expect(wildcard.nativeElement.textContent).toEqual(" * is busy  * is disabled  * total: 100 - current: 50 ")
    })
    it("connect is busy", async () => {
        cmp.componentInstance.childList().child3().busySource$.next(true)
        cmp.detectChanges()

        const child1 = cmp.debugElement.query(By.css("busy-child[nubusy='child1']"))
        expect(child1.nativeElement.textContent).toEqual(" child1 is free  child1 is disabled ")

        const child2 = cmp.debugElement.query(By.css("busy-child[nubusy='child2']"))
        expect(child2.nativeElement.textContent).toEqual(" child2 is free  child2 is disabled ")

        const nobusy = cmp.debugElement.query(By.css("busy-child:not([nubusy])"))
        expect(nobusy.nativeElement.textContent).toEqual(" unknown is free ")

        const connect = cmp.debugElement.query(By.css("busy-connect"))
        expect(connect.nativeElement.textContent).toEqual(" [connect:child3] is busy  is enabled ")

        const wildcard = cmp.debugElement.query(By.css("busy-child[nubusy='*']"))
        expect(wildcard.nativeElement.textContent).toEqual(" * is busy  * is disabled ")
    })
})
