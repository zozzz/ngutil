import { Literal } from "./literal"

describe("Literal", () => {
    it("parse string", () => {
        expect(Literal.parse("hello world")).toStrictEqual(new Literal("hello world"))
    })
    it("parse string w comment", () => {
        expect(Literal.parse("hello world;//comment")).toStrictEqual(new Literal("hello world", undefined, "comment"))
        expect(Literal.parse("hello world ;//comment")).toStrictEqual(new Literal("hello world", undefined, "comment"))
        expect(Literal.parse("hello world ; //comment")).toStrictEqual(new Literal("hello world", undefined, "comment"))
        expect(Literal.parse("hello world; //comment")).toStrictEqual(new Literal("hello world", undefined, "comment"))
        expect(Literal.parse("hello world; // comment")).toStrictEqual(new Literal("hello world", undefined, "comment"))
        expect(Literal.parse("hello world; // comment    ")).toStrictEqual(
            new Literal("hello world", undefined, "comment")
        )
    })
    it("parse number", () => {
        expect(Literal.parse("1")).toStrictEqual(new Literal(1))
        expect(Literal.parse("-1")).toStrictEqual(new Literal(-1))
        expect(Literal.parse(".100")).toStrictEqual(new Literal(0.1))
        expect(Literal.parse(".100s")).toStrictEqual(new Literal(0.1, "s"))
        expect(Literal.parse("100ms")).toStrictEqual(new Literal(100, "ms"))
        expect(Literal.parse("100px")).toStrictEqual(new Literal(100, "px"))
        expect(Literal.parse("-42px")).toStrictEqual(new Literal(-42, "px"))
    })
    it("parse number w comment", () => {
        expect(Literal.parse("-42px;//comment")).toStrictEqual(new Literal(-42, "px", "comment"))
    })
    it("parse flags", () => {
        expect(Literal.parse("-42px !str")).toStrictEqual(new Literal(-42, "px", undefined, { str: true }))
        expect(Literal.parse("-42px !color")).toStrictEqual(new Literal(-42, "px", undefined, { color: true }))
        expect(Literal.parse("-42px !default")).toStrictEqual(new Literal(-42, "px", undefined, { default: true }))
        expect(Literal.parse("(-42px)")).toStrictEqual(new Literal("(-42px)", undefined, undefined, { str: true }))
        expect(Literal.parse("rgb(0, 0, 0)")).toStrictEqual(
            new Literal("rgb(0, 0, 0)", undefined, undefined, { color: true })
        )
        expect(Literal.parse("rgba(0, 0, 0)")).toStrictEqual(
            new Literal("rgba(0, 0, 0)", undefined, undefined, { color: true })
        )
        expect(Literal.parse("hsl(0, 0, 0)")).toStrictEqual(
            new Literal("hsl(0, 0, 0)", undefined, undefined, { color: true })
        )
        expect(Literal.parse("hsla(0, 0, 0)")).toStrictEqual(
            new Literal("hsla(0, 0, 0)", undefined, undefined, { color: true })
        )
        expect(Literal.parse("#ccc")).toStrictEqual(new Literal("#ccc", undefined, undefined, { color: true }))
    })
})
