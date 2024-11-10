import { L9Cell, L9Range } from "./range"

describe("L9Range", () => {
    it("parse vertical", () => {
        expect(L9Range.coerce("left").cells).toStrictEqual([
            new L9Cell("top", "left"),
            new L9Cell("middle", "left"),
            new L9Cell("bottom", "left")
        ])
        expect(L9Range.coerce("left").orient).toStrictEqual("vertical")
        expect(L9Range.coerce("center").cells).toStrictEqual([
            new L9Cell("top", "center"),
            new L9Cell("middle", "center"),
            new L9Cell("bottom", "center")
        ])
        expect(L9Range.coerce("right").cells).toStrictEqual([
            new L9Cell("top", "right"),
            new L9Cell("middle", "right"),
            new L9Cell("bottom", "right")
        ])
    })

    it("parse horizontal", () => {
        expect(L9Range.coerce("top").cells).toStrictEqual([
            new L9Cell("top", "left"),
            new L9Cell("top", "center"),
            new L9Cell("top", "right")
        ])
        expect(L9Range.coerce("top").orient).toStrictEqual("horizontal")
        expect(L9Range.coerce("middle").cells).toStrictEqual([
            new L9Cell("middle", "left"),
            new L9Cell("middle", "center"),
            new L9Cell("middle", "right")
        ])
        expect(L9Range.coerce("bottom").cells).toStrictEqual([
            new L9Cell("bottom", "left"),
            new L9Cell("bottom", "center"),
            new L9Cell("bottom", "right")
        ])
    })

    it("parse cell", () => {
        expect(L9Range.coerce("top:left").cells).toStrictEqual([new L9Cell("top", "left")])
        expect(L9Range.coerce("bottom:right").cells).toStrictEqual([new L9Cell("bottom", "right")])
        expect(() => L9Range.coerce("x:y" as any)).toThrow(Error)
    })

    it("parse range", () => {
        expect(L9Range.coerce("top:left-top:right").cells).toStrictEqual([
            new L9Cell("top", "left"),
            new L9Cell("top", "center"),
            new L9Cell("top", "right")
        ])
        expect(L9Range.coerce("top:left-bottom:right").cells).toStrictEqual([
            new L9Cell("top", "left"),
            new L9Cell("top", "center"),
            new L9Cell("top", "right"),
            new L9Cell("middle", "left"),
            new L9Cell("middle", "center"),
            new L9Cell("middle", "right"),
            new L9Cell("bottom", "left"),
            new L9Cell("bottom", "center"),
            new L9Cell("bottom", "right")
        ])
        expect(L9Range.coerce("top:left-middle:center").cells).toStrictEqual([
            new L9Cell("top", "left"),
            new L9Cell("top", "center"),
            new L9Cell("middle", "left"),
            new L9Cell("middle", "center")
        ])
        expect(L9Range.coerce("middle:center-top:right").cells).toStrictEqual([
            new L9Cell("top", "center"),
            new L9Cell("top", "right"),
            new L9Cell("middle", "center"),
            new L9Cell("middle", "right")
        ])
        expect(L9Range.coerce("middle:center-bottom:left").cells).toStrictEqual([
            new L9Cell("middle", "left"),
            new L9Cell("middle", "center"),
            new L9Cell("bottom", "left"),
            new L9Cell("bottom", "center")
        ])
        expect(L9Range.coerce("middle:center-bottom:left").orient).toStrictEqual("vertical")
    })

    it("orinet", () => {
        console.log(L9Range.coerce("top:left-top:right").intoRect())
        expect(L9Range.coerce("top:left-top:right").orient).toStrictEqual("horizontal")
        expect(L9Range.coerce("top:left-top:center").orient).toStrictEqual("horizontal")
        expect(L9Range.coerce("top:left").orient).toStrictEqual("vertical")
        expect(L9Range.coerce("top:center").orient).toStrictEqual("horizontal")
        expect(L9Range.coerce("top:right").orient).toStrictEqual("vertical")
        expect(L9Range.coerce("top:left-middle:right").orient).toStrictEqual("horizontal")

        expect(L9Range.coerce("left:top-left:bottom").orient).toStrictEqual("vertical")
        expect(L9Range.coerce("left:top-left:middle").orient).toStrictEqual("vertical")
        expect(L9Range.coerce("left:top").orient).toStrictEqual("vertical")
        expect(L9Range.coerce("left:middle").orient).toStrictEqual("vertical")
        expect(L9Range.coerce("left:bottom").orient).toStrictEqual("vertical")
        expect(L9Range.coerce("top:left-bottom:center").orient).toStrictEqual("vertical")
    })
})
