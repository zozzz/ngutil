export interface Role {
    value: string
}

export enum ProductKind {
    Normal = "NORMAL",
    Virtual = "VIRTUAL"
}

export type SomeTuple = [number, string]

export interface UserName {
    first: string
    last: string
    title?: string | null
}

export interface User {
    id: number
    name: UserName
    age: number
    is_active: boolean
    roles: Array<Role>
}

export interface Category {
    id: number
    parent?: Category
    name: string
    author: User
    tuples: Array<SomeTuple>
}

export interface Product {
    id: number
    name: string
    categories: Array<Category>
    kind?: ProductKind | null
}

export const manager: Role = { value: "manager" }
export const admin: Role = { value: "admin" }
export const common: Role = { value: "common" }

export const user1: User = {
    id: 1,
    name: { first: "Elek", last: "Teszt" },
    age: 42,
    is_active: true,
    roles: [manager, admin]
}
export const user2: User = {
    id: 2,
    name: { first: "Jhon", last: "Doe", title: "Mr" },
    age: 34,
    is_active: true,
    roles: [common]
}
export const user3: User = {
    id: 3,
    name: { first: "Jane", last: "Doe" },
    age: 30,
    is_active: true,
    roles: [admin, manager]
}
export const users = [user1, user2, user3]

export const tuple1: SomeTuple = [1, "Tuple 1"]
export const tuple2: SomeTuple = [2, "Tuple 2"]
export const tuple3: SomeTuple = [3, "Tuple 3"]

export const category1: Category = { id: 1, name: "Category 1", author: user1, tuples: [tuple1, tuple3] }
export const category2: Category = { id: 2, name: "Category 2", author: user2, tuples: [tuple2] }
export const category3: Category = { id: 3, name: "Category 3", author: user3, tuples: [tuple3] }
export const categories = [category1, category2, category3]

export const product1: Product = {
    id: 1,
    name: "Product 1",
    kind: ProductKind.Normal,
    categories: [category1, category3]
}
export const product2: Product = { id: 2, name: "Product 2", kind: ProductKind.Virtual, categories: [category2] }
export const product3: Product = {
    id: 3,
    name: "Product 3",
    kind: ProductKind.Normal,
    categories: [category3, category1]
}
export const product4: Product = {
    id: 4,
    name: "Product 4",
    kind: ProductKind.Virtual,
    categories: [category1, category3, category1]
}
export const product5: Product = { id: 5, name: "Product 5", kind: null, categories: [] }
export const products = [product1, product2, product3, product4, product5]

// const xxx: Filters<Product> = { id: { alma: 10 } }
