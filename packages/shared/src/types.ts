export type OmitType<T, O> = T extends T ? (T extends O ? (O extends T ? never : T) : T) : never;

export type PickType<T, P> = T extends T ? (T extends P ? (P extends T ? T : never) : never) : never;
