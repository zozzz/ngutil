import type { UiStateDetails } from "./ui-state"

export type CompiledSelector = (state: UiStateDetails) => boolean

export const enum TokenType {
    Any = 1,
    Name = 2,
    Negate = 3,
    Or = 4,
    And = 5,
    Subscript = 7,
    MultiSubscript = 8
}

export interface AstBase {
    begin: number
    end: number
}

export interface AstAny extends AstBase {
    type: TokenType.Any
}

export interface AstName extends AstBase {
    type: TokenType.Name
    value: string
}

export interface AstNegate extends AstBase {
    type: TokenType.Negate
    value: SelectorAst
}

export interface AstOr extends AstBase {
    type: TokenType.Or
    left: SelectorAst
    right: SelectorAst
}

export interface AstAnd extends AstBase {
    type: TokenType.And
    left: SelectorAst
    right: SelectorAst
}

export interface AstSubscript extends AstBase {
    type: TokenType.Subscript
    base: AstName
    subscript: AstAny | AstName
}

export interface AstMultiSubscript extends AstBase {
    type: TokenType.MultiSubscript
    base: AstName
    subscripts: AstName[]
}

export type SelectorAst = AstAny | AstName | AstNegate | AstOr | AstAnd | AstSubscript | AstMultiSubscript

const COMPILE_CACHE: { [key: string]: CompiledSelector } = {}
export function compile(selector: string): CompiledSelector {
    return (COMPILE_CACHE[selector] ??= _compile(parse(selector)))
}

class Cursor {
    position: number = 0

    get ch() {
        return this.data[this.position]
    }

    constructor(readonly data: string) {}

    inc(value: number = 1) {
        this.position += value
        return this
    }

    eatWs() {
        let end = this.position
        while (end < this.data.length && /[ \r\n\t]/.test(this.data[end])) {
            end++
        }
        this.position = end
        return this
    }

    is(ch: string) {
        if (ch.length === 1) {
            return this.ch === ch
        }
        const begin = this.position
        const end = begin + ch.length
        return this.data.substring(begin, end) === ch
    }

    eof() {
        return this.position >= this.data.length
    }

    set(position: number) {
        this.position = position
        return this
    }
}

/**
 * expression:
 *  - "*": any
 *  - "name without dot": top level: eg. "busy" or "disabled", this is equal to "busy.*"
 *  - "name with dot": nested: eg. "busy.self" or "busy.loading"
 *  - negate: "!busy", "!busy.*", "!busy.save"
 *  - OR: "busy.* || !disabled.*"
 *  - AND: "busy.* && !disabled.*"
 *  - GROUP: "(busy || disabled) && !readonly"
 *  - Shorted of multiple source of same base: "busy{load,save}", if one of load or save is true, the result is true
 */
export function parse(selector: string): SelectorAst {
    const cursor = new Cursor(selector)
    const res = expression(cursor.eatWs())
    if (res == null) {
        throw new Error(`invalid selector: ${selector}`)
    }

    if (!cursor.eof()) {
        throw new Error(`unexpected charcter: ${selector[res.end]} at ${res.end}`)
    }
    return res
}

function expression(cursor: Cursor) {
    return binary(cursor) || leftExpr(cursor)
}

function leftExpr(cursor: Cursor) {
    const begin = cursor.position
    const left = unary(cursor) || group(cursor) || load(cursor)
    if (left != null) {
        return left
    }
    cursor.set(begin)
    return null
}

function group(cursor: Cursor): SelectorAst | null {
    const begin = cursor.position
    if (cursor.is("(")) {
        const expr = expression(cursor.inc().eatWs())
        if (cursor.eatWs().is(")")) {
            cursor.inc()
            return binary(cursor.eatWs(), expr) || expr
        }
    }
    cursor.set(begin)
    return null
}

function binary(cursor: Cursor, left: SelectorAst | null = null): SelectorAst | null {
    const begin = cursor.position
    left = left ?? leftExpr(cursor)
    if (left != null) {
        cursor.eatWs()
        const result = and(left, cursor) || or(left, cursor)
        if (result != null) {
            return result
        }
    }
    cursor.set(begin)
    return null
}

function and(left: SelectorAst, cursor: Cursor): AstAnd | null {
    if (cursor.is("&&")) {
        cursor.inc(2)
        const right = expression(cursor.eatWs())
        if (right == null) {
            return null
        }
        return { type: TokenType.And, left, right, begin: left.begin, end: cursor.position }
    }
    return null
}

function or(left: SelectorAst, cursor: Cursor): AstOr | null {
    if (cursor.is("||")) {
        cursor.inc(2)
        const right = expression(cursor.eatWs())
        if (right == null) {
            return null
        }
        return { type: TokenType.Or, left, right, begin: left.begin, end: cursor.position }
    }
    return null
}

function unary(cursor: Cursor): SelectorAst | null {
    const begin = cursor.position
    if (cursor.is("!")) {
        const expr = leftExpr(cursor.inc().eatWs())
        if (expr != null) {
            return { type: TokenType.Negate, value: expr, begin, end: cursor.position }
        }
    }
    cursor.set(begin)
    return null
}

function load(cursor: Cursor): AstAny | AstName | AstSubscript | AstMultiSubscript | null {
    cursor.eatWs()
    const _any = any(cursor)
    if (_any != null) {
        return _any
    }

    const base = name(cursor)
    if (base == null) {
        return null
    }

    cursor.eatWs()
    const sub = loadSingle(cursor) || loadMulti(cursor)
    if (sub == null) {
        return base
    } else if (Array.isArray(sub)) {
        return {
            type: TokenType.MultiSubscript,
            base,
            subscripts: sub,
            begin: base.begin,
            end: sub[sub.length - 1].end
        }
    } else {
        return { type: TokenType.Subscript, base, subscript: sub, begin: base.begin, end: sub.end }
    }
}

function loadSingle(cursor: Cursor): AstAny | AstName | null {
    const begin = cursor.position
    if (cursor.is(".")) {
        cursor.inc().eatWs()
        const prop = any(cursor) || name(cursor)
        if (prop != null) {
            return prop
        }
    }
    cursor.set(begin)
    return null
}

function loadMulti(cursor: Cursor): AstName[] | null {
    const begin = cursor.position
    if (cursor.is("{")) {
        const names = [] as AstName[]
        let entry: AstName | null = null

        cursor.inc().eatWs()
        while ((entry = name(cursor))) {
            names.push(entry)
            cursor.eatWs()

            if (cursor.is(",")) {
                cursor.inc()
            }

            cursor.eatWs()
            if (cursor.is("}")) {
                if (names.length === 0) {
                    throw new Error("expected name")
                }
                cursor.inc()
                return names
            }
        }
    }
    cursor.set(begin)
    return null
}

function name(cursor: Cursor): AstName | null {
    const begin = cursor.position
    while (!cursor.eof() && isNameCh(cursor.ch)) {
        cursor.inc()
    }
    if (cursor.position > begin) {
        return { type: TokenType.Name, begin, end: cursor.position, value: cursor.data.slice(begin, cursor.position) }
    }
    cursor.set(begin)
    return null
}

function isNameCh(ch: string): boolean {
    return /[^.,{}()!\s&|]/.test(ch)
}

function any(cursor: Cursor): AstAny | null {
    if (cursor.is("*")) {
        const begin = cursor.position
        cursor.inc()
        return { type: TokenType.Any, begin, end: cursor.position }
    }
    return null
}

function _compile(ast: SelectorAst, parent?: string): CompiledSelector {
    switch (ast.type) {
        case TokenType.Any:
            return compileAny(ast, parent)
        case TokenType.Subscript:
            return compileSubscript(ast, parent)
        case TokenType.MultiSubscript:
            return compileMultiSubscript(ast, parent)
        case TokenType.Name:
            return compileName(ast, parent)
        case TokenType.Negate:
            return compileNot(_compile(ast.value, parent))
        case TokenType.Or:
            return compileOr(_compile(ast.left, parent), _compile(ast.right, parent))
        case TokenType.And:
            return compileAnd(_compile(ast.left, parent), _compile(ast.right, parent))
    }
    return () => false
}

function compileAny(ast: AstAny, parent?: string): CompiledSelector {
    if (parent) {
        return v => {
            if (v[parent] == null) {
                return false
            }
            return Object.values(v[parent]).some(v => v === true)
        }
    } else {
        return v => {
            for (const entry of Object.values(v)) {
                if (Object.values(entry).some(v => v === true)) {
                    return true
                }
            }
            return false
        }
    }
}

function compileSubscript(ast: AstSubscript, parent?: string): CompiledSelector {
    parent ??= ast.base.value

    if (ast.subscript.type === TokenType.Any) {
        return compileAny(ast.subscript, parent)
    }
    if (ast.subscript.type === TokenType.Name) {
        return compileName(ast.subscript, parent)
    }

    return () => false
}

function compileMultiSubscript(ast: AstMultiSubscript, parent?: string): CompiledSelector {
    parent ??= ast.base.value
    const values = ast.subscripts.map(v =>
        compileSubscript(
            { type: TokenType.Subscript, base: ast.base, subscript: v, begin: v.begin, end: v.end },
            parent
        )
    )

    if (values.length === 1) {
        return values[0]
    } else {
        let result = values[0]
        for (let i = 1; i < values.length; i++) {
            result = compileOr(result, values[i])
        }
        return result
    }
}

function compileName(ast: AstName, parent?: string): CompiledSelector {
    if (parent) {
        return v => {
            if (v[parent] == null) {
                return false
            }
            return !!v[parent][ast.value]
        }
    } else {
        return v => {
            const many = v[ast.value]
            return many != null && Object.values(many).some(v => v === true)
        }
    }
}

function compileNot(compiled: CompiledSelector): CompiledSelector {
    return v => !compiled(v)
}

function compileOr(left: CompiledSelector, right: CompiledSelector): CompiledSelector {
    return v => left(v) || right(v)
}

function compileAnd(left: CompiledSelector, right: CompiledSelector): CompiledSelector {
    return v => left(v) && right(v)
}
