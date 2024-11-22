import { floatingPosition, FloatingPositionInput } from "./floating-position"

describe("position-compute", () => {
    it("dialog", () => {
        const input: FloatingPositionInput = {
            dims: {
                anchor: { x: 0, y: 0, width: 500, height: 500 },
                placement: { x: 0, y: 0, width: 500, height: 500 },
                content: { width: 100, height: 200 }
            },
            options: {
                anchor: { link: "center middle" },
                content: { link: "center middle" },
                placement: {}
            }
        }

        const res = floatingPosition(input)
        expect(res).toMatchSnapshot()
    })

    it("flip-right-overflow", () => {
        const input: FloatingPositionInput = {
            dims: {
                anchor: { x: 400, y: 0, width: 100, height: 100 },
                placement: { x: 0, y: 0, width: 500, height: 500 },
                content: { width: 200, height: 100 }
            },
            options: {
                anchor: { link: "right middle" },
                content: { link: "left middle" },
                placement: {},
                horizontalAlt: "flip"
            }
        }

        const res = floatingPosition(input)
        expect(res).toMatchSnapshot()
    })

    it("flip-left-overflow", () => {
        const input: FloatingPositionInput = {
            dims: {
                anchor: { x: 30, y: 30, width: 100, height: 100 },
                placement: { x: 0, y: 0, width: 500, height: 500 },
                content: { width: 100, height: 100 }
            },
            options: {
                anchor: { link: "left top" },
                content: { link: "right top" },
                placement: {},
                horizontalAlt: "flip"
            }
        }

        const res = floatingPosition(input)
        expect(res).toMatchSnapshot()
    })

    it("flip-top-overflow", () => {
        const input: FloatingPositionInput = {
            dims: {
                anchor: { x: 30, y: 30, width: 100, height: 100 },
                placement: { x: 0, y: 0, width: 500, height: 500 },
                content: { width: 100, height: 100 }
            },
            options: {
                anchor: { link: "left top" },
                content: { link: "left bottom" },
                placement: {},
                verticalAlt: "flip"
            }
        }

        const res = floatingPosition(input)
        expect(res).toMatchSnapshot()
    })

    it("flip-bottom-overflow", () => {
        const input: FloatingPositionInput = {
            dims: {
                anchor: { x: 30, y: 450, width: 100, height: 100 },
                placement: { x: 0, y: 0, width: 500, height: 500 },
                content: { width: 100, height: 100 }
            },
            options: {
                anchor: { link: "left bottom" },
                content: { link: "left top" },
                placement: {},
                verticalAlt: "flip"
            }
        }

        const res = floatingPosition(input)
        expect(res).toMatchSnapshot()
    })
})
