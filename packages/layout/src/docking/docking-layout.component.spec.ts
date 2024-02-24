import { ComponentFixture, TestBed } from "@angular/core/testing"

import { DockingLayoutComponent } from "./docking-layout.component"

describe("DockingLayoutComponent", () => {
    let component: DockingLayoutComponent
    let fixture: ComponentFixture<DockingLayoutComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [DockingLayoutComponent]
        }).compileComponents()

        fixture = TestBed.createComponent(DockingLayoutComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    })

    it("should create", () => {
        expect(component).toBeTruthy()
    })
})
