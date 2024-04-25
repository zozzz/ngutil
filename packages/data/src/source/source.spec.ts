import { firstValueFrom } from "rxjs"
import { ArrayProvider } from "../provider"

const ArrayItems = new ArrayProvider({ keys: ["id"] }, [
    {id: 1, name: "Item 1"},
    {id: 2, name: "Item 2"},
    {id: 3, name: "Item 3"},
    {id: 4, name: "Item 4"},
    {id: 5, name: "Item 5"}
])

describe("DataSource", () => {
    describe("Array", () => {
        it("clampSlice", async () => {
            const src = ArrayItems.toDataSource().all()
            const slice = await firstValueFrom(src.slice$)
            expect(slice).toEqual({start: 0, end: 5})
        })

        it("items", async () => {
            const src = ArrayItems.toDataSource().all()
            const items = await firstValueFrom(src.items$)
            expect(items.map(v => v?.id)).toEqual([1, 2, 3, 4, 5])
        })
    })
})
