import { firstValueFrom } from "rxjs"

import { ModelRefByIndex } from "../model"
import { MemoryStore } from "./memory-store"

describe("MemorySotre", () => {
    let store!: MemoryStore<any>

    beforeEach(async () => {
        store = new MemoryStore()
        const items = await firstValueFrom(store.insertSlice({ start: 0, end: 5 }, [1, 2, 3, 4, 5]))
        expect(items).toEqual([1, 2, 3, 4, 5])
    })

    it("insertSlice", async () => {
        const items = await firstValueFrom(store.insertSlice({ start: 1, end: 3 }, [22, 33]))
        expect(items).toEqual([1, 22, 33, 4, 5])
    })

    it("hasSlice", async () => {
        const has = await firstValueFrom(store.hasSlice({ start: 0, end: 2 }))
        expect(has).toStrictEqual(true)
    })

    it("hasNotSlice", async () => {
        const has = await firstValueFrom(store.hasSlice({ start: 0, end: 10 }))
        expect(has).toStrictEqual(false)
    })

    it("getSlice", async () => {
        const items = await firstValueFrom(store.getSlice({ start: 1, end: 3 }))
        expect(items).toEqual([2, 3])
    })

    it("getByRef", async () => {
        const ref = new ModelRefByIndex(2)
        const item = await firstValueFrom(store.get(ref))
        expect(item).toEqual(3)
    })

    it("getByRefMissing", async () => {
        const ref = new ModelRefByIndex(200)
        const item = await firstValueFrom(store.get(ref))
        expect(item).toEqual(undefined)
    })

    it("indexOf", async () => {
        const ref = new ModelRefByIndex(2)
        const item = await firstValueFrom(store.indexOf(ref))
        expect(item).toEqual(2)
    })

    it("indexOfMissing", async () => {
        const ref = new ModelRefByIndex(200)
        const item = await firstValueFrom(store.indexOf(ref))
        expect(item).toEqual(-1)
    })

    it("update", async () => {
        const ref = new ModelRefByIndex(1)
        const index = await firstValueFrom(store.update(ref, 200))
        expect(index).toEqual(1)

        const item = await firstValueFrom(store.get(ref))
        expect(item).toStrictEqual(200)
    })

    it("updateOrInsert 1", async () => {
        const ref = new ModelRefByIndex(1)
        const index = await firstValueFrom(store.updateOrInsert(ref, 200))
        expect(index).toEqual(1)

        const item = await firstValueFrom(store.get(ref))
        expect(item).toStrictEqual(200)
    })

    it("updateOrInsert 100", async () => {
        const ref = new ModelRefByIndex(100)
        const index = await firstValueFrom(store.updateOrInsert(ref, 200, 100))
        expect(index).toEqual(100)

        const item = await firstValueFrom(store.get(ref))
        expect(item).toStrictEqual(200)
    })

    it("del 1", async () => {
        const ref = new ModelRefByIndex(1)
        const index = await firstValueFrom(store.del(ref))
        expect(index).toEqual(1)

        const items = await firstValueFrom(store.getSlice({ start: 0, end: 4 }))
        expect(items).toStrictEqual([1, 3, 4, 5])
    })

    it("clear", async () => {
        await firstValueFrom(store.clear())
        const items = await firstValueFrom(store.getSlice({ start: 0, end: 5 }))
        expect(items).toEqual([undefined, undefined, undefined, undefined, undefined])
    })
})
