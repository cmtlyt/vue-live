export type OmitType<T, O> = T extends T ? (T extends O ? (O extends T ? never : T) : T) : never;
