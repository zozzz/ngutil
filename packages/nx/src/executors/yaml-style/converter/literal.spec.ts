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
})
