import { compile, parse, SelectorAst, TokenType } from "./selector"
import { UiStateDetails } from "./ui-state"

describe("ui state selector", () => {
    const cases: Array<[string, SelectorAst]> = [
        ["a", { type: TokenType.Name, begin: 0, end: 1, value: "a" }],
        ["alma", { type: TokenType.Name, begin: 0, end: 4, value: "alma" }],
        ["*", { type: TokenType.Any, begin: 0, end: 1 }],
        [
            "busy.load",
            {
                type: TokenType.Subscript,
                base: { type: TokenType.Name, begin: 0, end: 4, value: "busy" },
                subscript: { type: TokenType.Name, begin: 5, end: 9, value: "load" },
                begin: 0,
                end: 9
            }
        ],
        [
            "busy.*",
            {
                type: TokenType.Subscript,
                base: { type: TokenType.Name, begin: 0, end: 4, value: "busy" },
                subscript: { type: TokenType.Any, begin: 5, end: 6 },
                begin: 0,
                end: 6
            }
        ],
        [
            "!busy.*",
            {
                type: TokenType.Negate,
                value: {
                    type: TokenType.Subscript,
                    base: { type: TokenType.Name, begin: 1, end: 5, value: "busy" },
                    subscript: { type: TokenType.Any, begin: 6, end: 7 },
                    begin: 1,
                    end: 7
                },
                begin: 0,
                end: 7
            }
        ],
        [
            "busy{load}",
            {
                type: TokenType.MultiSubscript,
                base: { type: TokenType.Name, begin: 0, end: 4, value: "busy" },
                subscripts: [{ type: TokenType.Name, begin: 5, end: 9, value: "load" }],
                begin: 0,
                end: 9
            }
        ],
        [
            "!busy{load}",
            {
                type: TokenType.Negate,
                value: {
                    type: TokenType.MultiSubscript,
                    base: { type: TokenType.Name, begin: 1, end: 5, value: "busy" },
                    subscripts: [{ type: TokenType.Name, begin: 6, end: 10, value: "load" }],
                    begin: 1,
                    end: 10
                },
                begin: 0,
                end: 11
            }
        ],
        [
            "busy  {  load  , save   }",
            {
                type: TokenType.MultiSubscript,
                base: { type: TokenType.Name, begin: 0, end: 4, value: "busy" },
                subscripts: [
                    { type: TokenType.Name, begin: 9, end: 13, value: "load" },
                    { type: TokenType.Name, begin: 17, end: 21, value: "save" }
                ],
                begin: 0,
                end: 21
            }
        ],
        [
            "busy && disabled",
            {
                type: TokenType.And,
                left: { type: 2, begin: 0, end: 4, value: "busy" },
                right: { type: 2, begin: 8, end: 16, value: "disabled" },
                begin: 0,
                end: 16
            }
        ],
        [
            "(busy && disabled) || readonly",
            {
                type: TokenType.Or,
                left: {
                    type: TokenType.And,
                    left: { type: 2, begin: 1, end: 5, value: "busy" },
                    right: { type: 2, begin: 9, end: 17, value: "disabled" },
                    begin: 1,
                    end: 17
                },
                right: { type: 2, begin: 22, end: 30, value: "readonly" },
                begin: 1,
                end: 30
            }
        ],
        [
            "(busy || disabled) && readonly",
            {
                type: TokenType.And,
                left: {
                    type: TokenType.Or,
                    left: { type: 2, begin: 1, end: 5, value: "busy" },
                    right: { type: 2, begin: 9, end: 17, value: "disabled" },
                    begin: 1,
                    end: 17
                },
                right: { type: 2, begin: 22, end: 30, value: "readonly" },
                begin: 1,
                end: 30
            }
        ],
        [
            "busy || disabled",
            {
                type: TokenType.Or,
                left: { type: 2, begin: 0, end: 4, value: "busy" },
                right: { type: 2, begin: 8, end: 16, value: "disabled" },
                begin: 0,
                end: 16
            }
        ],
        [
            "!busy",
            {
                type: TokenType.Negate,
                value: { type: 2, begin: 1, end: 5, value: "busy" },
                begin: 0,
                end: 5
            }
        ],
        [
            "!busy && readonly",
            {
                type: TokenType.And,
                left: {
                    type: TokenType.Negate,
                    value: { type: TokenType.Name, begin: 1, end: 5, value: "busy" },
                    begin: 0,
                    end: 6
                },
                right: { type: TokenType.Name, begin: 9, end: 17, value: "readonly" },
                begin: 0,
                end: 17
            }
        ],
        [
            "!busy && !readonly",
            {
                type: TokenType.And,
                left: {
                    type: TokenType.Negate,
                    value: { type: TokenType.Name, begin: 1, end: 5, value: "busy" },
                    begin: 0,
                    end: 6
                },
                right: {
                    type: TokenType.Negate,
                    value: { type: TokenType.Name, begin: 10, end: 18, value: "readonly" },
                    begin: 9,
                    end: 18
                },
                begin: 0,
                end: 18
            }
        ],
        [
            "!(busy && readonly)",
            {
                type: TokenType.Negate,
                value: {
                    type: TokenType.And,
                    left: { type: TokenType.Name, begin: 2, end: 6, value: "busy" },
                    right: { type: TokenType.Name, begin: 10, end: 18, value: "readonly" },
                    begin: 2,
                    end: 18
                },
                begin: 0,
                end: 19
            }
        ],
        ["!*", { type: TokenType.Negate, value: { type: TokenType.Any, begin: 1, end: 2 }, begin: 0, end: 2 }],
        [
            "busy.* || !disabled.*",
            {
                type: TokenType.Or,
                left: {
                    type: TokenType.Subscript,
                    base: { type: TokenType.Name, begin: 0, end: 4, value: "busy" },
                    subscript: { type: TokenType.Any, begin: 5, end: 6 },
                    begin: 0,
                    end: 6
                },
                right: {
                    type: TokenType.Negate,
                    value: {
                        type: TokenType.Subscript,
                        base: { type: TokenType.Name, begin: 11, end: 19, value: "disabled" },
                        subscript: { type: TokenType.Any, begin: 20, end: 21 },
                        begin: 11,
                        end: 21
                    },
                    begin: 10,
                    end: 21
                },
                begin: 0,
                end: 21
            }
        ]
    ]

    for (const [k, v] of cases) {
        it(k, () => {
            expect(parse(k)).toEqual(v)
        })
    }
})

describe("ui state compile", () => {
    const cases: Array<[string, UiStateDetails, boolean]> = [
        ["busy", { busy: { self: true } }, true],
        ["busy", { busy: { self: false, load: true } }, true],
        ["busy", { busy: { self: false, load: false } }, false],
        ["busy.*", { busy: { self: false, load: false } }, false],
        ["busy{load}", { busy: { self: false, load: true } }, true],
        ["busy{self}", { busy: { self: false, load: true } }, false],
        ["busy{self,load}", { busy: { self: false, load: false } }, false],
        ["*", { busy: { self: false, load: true } }, true],
        ["*", { busy: { self: false, load: false }, disabled: { self: true } }, true],
        ["busy || disabled", { busy: { self: false, load: false }, disabled: { self: true } }, true],
        ["busy.load || disabled.load", { busy: { self: false, load: false }, disabled: { self: true } }, false],
        ["busy.self && disabled.self", { busy: { self: true, load: false }, disabled: { self: true } }, true],
        ["busy.self && disabled.self", { busy: { self: false, load: false }, disabled: { self: true } }, false],
        ["!busy.self", { busy: { self: false, load: false }, disabled: { self: true } }, true],
        ["!busy.self && disabled.self", { busy: { self: false, load: false }, disabled: { self: true } }, true],
        ["!busy && *", { busy: { self: false, load: false }, disabled: { self: true } }, true],
        ["!busy && *", { busy: { self: false, load: true } }, false]
        // TODO: valami másik szintaxis kéne, hogy ki lehessen veni egy vagy több elemetn a csillagból
        // pl.: *^{busy}
        // ["!busy && *", { busy: { self: false, load: false } }, true]
    ]

    for (const [k, s, v] of cases) {
        it(k, () => {
            console.log(k, compile(k)(s))
            expect(compile(k)(s)).toEqual(v)
        })
    }
})
