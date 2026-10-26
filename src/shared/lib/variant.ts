export type WithMessage = {
  message: string;
};

// `void` — у ветки нет своих полей.
export type Variant<Key extends string, Spec extends Record<string, object | void>> = {
  [K in keyof Spec & string]: Spec[K] extends void
    ? { [P in Key]: K }
    : { [P in Key]: K } & Exclude<Spec[K], void>;
}[keyof Spec & string];

export type Ok<T extends object, E extends object = WithMessage> =
  | ({ ok: true } & T)
  | ({ ok: false } & E);
