import { Slice, sliceApply, sliceInsert } from "./slice"

describe("Slice", () => {
    describe("sliceInsert", () => {
        const cases: Array<[any[], Slice, any[], any[]]> = [
            [[], { start: 1, end: 2 }, [1], [undefined, 1]],
            [[1], { start: 1, end: 2 }, [2], [1, 2]],
            [[1], { start: 0, end: 2 }, [2], [2, undefined]],
            [[1, 2, 3, 4], { start: 1, end: 3 }, [22, 33], [1, 22, 33, 4]],
            [[1, 2, 3, 4], { start: 1, end: 6 }, [22, 33], [1, 22, 33, undefined, undefined]]
        ]

        for (const [inp, slice, update, res] of cases) {
            it(`${inp.join(",")} - ${JSON.stringify(slice)} - ${update.join(",")}`, () => {
                expect(sliceInsert(slice, inp, update)).toEqual(res)
            })
        }
    })

    describe("sliceApply", () => {
        const cases: Array<[any[], Slice, any[]]> = [
            [[1, 2, 3, 4, 5], { start: 0, end: 0 }, []],
            [[1, 2, 3, 4, 5], { start: 0, end: 1 }, [1]],
            [[1, 2, 3, 4, 5], { start: 0, end: 2 }, [1, 2]],
            [[1, 2, 3, 4, 5], { start: 2, end: 3 }, [3]]
        ]

        for (const [inp, slice, res] of cases) {
            it(`${inp.join(",")} - ${JSON.stringify(slice)}`, () => {
                expect(sliceApply(slice, inp)).toEqual(res)
            })
        }
    })
})
