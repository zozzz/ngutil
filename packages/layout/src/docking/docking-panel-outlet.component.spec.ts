import { ComponentFixture, TestBed } from "@angular/core/testing"

import { DockingPanelOutletComponent } from "./docking-panel-outlet.component"

describe("DockingPanelOutletComponent", () => {
    let component: DockingPanelOutletComponent
    let fixture: ComponentFixture<DockingPanelOutletComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DockingPanelOutletComponent]
        }).compileComponents()

        fixture = TestBed.createComponent(DockingPanelOutletComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it("should create", () => {
        expect(component).toBeTruthy()
    })
})
