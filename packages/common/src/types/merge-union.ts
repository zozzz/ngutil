import { Eval } from "./util"

// type Test =
//     | { state: "ACTIVE" }
//     | { state: "INACTIVE" }
//     | { visible: boolean }
//     | { is_active: true }
//     | { is_active: false }

type AllKeys<T> = T extends any ? keyof T : never

type TypeOfKey<T, TK extends AllKeys<T>> = T extends { [K in TK]?: any } ? T[TK] : never
// const _State: TypeOfKey<Test, "state"> = null as any

// export type MergeUnion<T> = Eval<{ [K in AllKeys<T>]: TypeOfKey<T, K> }>
export type MergeUnion<T> = Eval<{ [K in AllKeys<T>]: TypeOfKey<T, K> }>
// const final: MergeUnion<Test> = null as any
