// import { ScrollingModule } from "@angular/cdk/scrolling"
// import { AsyncPipe } from "@angular/common"
// import { Component, inject } from "@angular/core"
// import { ComponentFixture, TestBed } from "@angular/core/testing"
// import { By } from "@angular/platform-browser"

// import { ArrayProvider } from "../provider"
// import { MemoryStore } from "../store"
// import { DataSourceProxy } from "./proxy.directive"

// interface User {
//     id: number
//     name: string
// }

// @Component({
//     selector: "basic-list",
//     imports: [AsyncPipe],
//     template: `
//         <ol>
//             @for (item of ds.items$ | async; track item.id) {
//                 <li>{{ item.label }}</li>
//             }
//         </ol>
//     `
// })
// class BasicListComponent {
//     ds = inject(DataSourceProxy)

//     // constructor() {
//     //     this.ds.value$
//     // }
// }

// @Component({
//     selector: "virtual-list",
//     imports: [ScrollingModule],
//     template: `
//         <cdk-virtual-scroll-viewport itemSize="50" style="height: 1000px">
//             <div *cdkVirtualFor="let item of ds">{{ item.name }}</div>
//         </cdk-virtual-scroll-viewport>
//     `
// })
// class VirtualListComponent {
//     ds = inject(DataSourceProxy)
// }

// @Component({
//     imports: [DataSourceProxy, BasicListComponent, VirtualListComponent],
//     template: `
//         <basic-list [nuDataSource]="users1" />
//         <virtual-list [nuDataSource]="users2" />
//     `
// })
// class RootComponent {
//     readonly users1 = new ArrayProvider<User>({ keys: ["id"] }, [
//         { id: 1, name: "Jhon Doe" },
//         { id: 2, name: "Jane Doe" }
//     ])
//         .toDataSource(new MemoryStore())
//         .setSlice({ start: 0, end: 10 })

//     readonly users2 = new ArrayProvider<User>({ keys: ["id"] }, [
//         { id: 10, name: "Jhon Doe" },
//         { id: 20, name: "Jane Doe" }
//     ]).toDataSource(new MemoryStore())
// }

// async function wait(ms: number) {
//     return new Promise(resolve => setTimeout(resolve, ms))
// }

// describe("DataSourceProxy", () => {
//     let cmp!: ComponentFixture<RootComponent>

//     beforeEach(async () => {
//         return
//         await TestBed.configureTestingModule({
//             imports: [RootComponent]
//         }).compileComponents()
//         cmp = TestBed.createComponent(RootComponent)
//         cmp.autoDetectChanges(true)
//         await cmp.whenStable()
//     })

//     it("root", async () => {
//         return
//         // cmp.componentInstance.users.setSlice({ start: 0, end: 200 })

//         // cmp.componentInstance.users1.items$.subscribe(items => console.log("USERS1", items))
//         // cmp.componentInstance.users2.items$.subscribe(items => console.log("users2", items))
//         // cmp.componentInstance.users2.setSlice({ start: 0, end: 200 })

//         await wait(500)
//         cmp.detectChanges()

//         const basicList = cmp.debugElement.query(By.css("basic-list"))
//         // console.log("textContent:", basicList.nativeElement.textContent)
//         // console.log("nativeElement:", cmp.debugElement.nativeElement)
//     })
// })
describe("DataSourceProxy", () => {
    it("TODO", () => {})
})
