import { NumberWithUnit } from "./number-with-unit"

describe("Number with unit", () => {
    it("parse", () => {
        expect(NumberWithUnit.coerce("10")).toStrictEqual(new NumberWithUnit(10))
        expect(NumberWithUnit.coerce("10px")).toStrictEqual(new NumberWithUnit(10, "px"))
        expect(NumberWithUnit.coerce("10 %")).toStrictEqual(new NumberWithUnit(10, "%"))
        expect(NumberWithUnit.coerce("auto")).toStrictEqual(new NumberWithUnit(NaN, "auto"))
    })
})
