import * as Case from "case"

export function pascalCase(value: string): string {
    return Case.pascal(value)
}

export function kebabCase(value: string): string {
    return Case.kebab(value)
}

export function camelCase(value: string): string {
    return Case.camel(value)
}
