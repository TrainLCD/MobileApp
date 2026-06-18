import {
  TrainDirection,
  TrainTypeKind,
  type TrainTypeNested,
} from '~/@types/graphql';

// Subset of TrainType fields a deep link / route resolver short code is
// allowed to carry. Rejected fields (`id` / `typeId` / `groupId` / `line` /
// `lines` / `nameTtsSegments`) deliberately do not appear here — they are
// server-owned identity / structural data that must never be injected from
// shared URLs. See issue #6018 for the rationale.
export type TrainTypeOverrideInput = {
  name?: unknown;
  color?: unknown;
  kind?: unknown;
  direction?: unknown;
  nameRoman?: unknown;
  nameKatakana?: unknown;
  nameChinese?: unknown;
  nameKorean?: unknown;
  nameRomanIpa?: unknown;
};

export type TrainTypeOverrideResult =
  | { status: 'absent' }
  | { status: 'invalid' }
  | { status: 'valid'; trainType: TrainTypeNested };

const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const TRAIN_TYPE_KIND_VALUES = new Set<string>(
  Object.values(TrainTypeKind) as string[]
);
const TRAIN_DIRECTION_VALUES = new Set<string>(
  Object.values(TrainDirection) as string[]
);

// `present` means the input attempted to specify the field (so even an empty
// string is `present`, not `absent`). The caller decides whether emptiness is
// acceptable per-field — `name` / `color` reject empty, optional name* fields
// allow it.
type FieldState =
  | { state: 'absent' }
  | { state: 'invalid' }
  | { state: 'present'; value: string };

const readStringField = (raw: unknown): FieldState => {
  if (raw === undefined || raw === null) {
    return { state: 'absent' };
  }
  if (typeof raw !== 'string') {
    return { state: 'invalid' };
  }
  return { state: 'present', value: raw };
};

const hasAnyField = (raw: TrainTypeOverrideInput): boolean => {
  for (const value of Object.values(raw)) {
    if (value !== undefined && value !== null) {
      return true;
    }
  }
  return false;
};

// Normalize lowercase. The Route Builder spec normalizes outgoing color to
// lowercase, but accept either case so a hand-written link still works.
const normalizeColor = (raw: string): string => raw.toLowerCase();

export const parseTrainTypeOverride = (
  raw: TrainTypeOverrideInput
): TrainTypeOverrideResult => {
  if (!hasAnyField(raw)) {
    return { status: 'absent' };
  }

  // name: required, non-empty string.
  const nameField = readStringField(raw.name);
  if (nameField.state !== 'present' || nameField.value.length === 0) {
    return { status: 'invalid' };
  }

  // color: required, #RRGGBB (case-insensitive).
  const colorField = readStringField(raw.color);
  if (colorField.state !== 'present' || !COLOR_PATTERN.test(colorField.value)) {
    return { status: 'invalid' };
  }

  // kind: optional, TrainTypeKind enum.
  let kind: TrainTypeKind | null = null;
  const kindField = readStringField(raw.kind);
  if (kindField.state === 'invalid') {
    return { status: 'invalid' };
  }
  if (kindField.state === 'present') {
    if (!TRAIN_TYPE_KIND_VALUES.has(kindField.value)) {
      return { status: 'invalid' };
    }
    kind = kindField.value as TrainTypeKind;
  }

  // direction: optional, TrainDirection enum. URL form (sids / sgid+lid) never
  // supplies this — the spec reserves it for the route resolver payload —
  // but the validator does not need to enforce origin; just that, when
  // provided, the value is in the enum.
  let direction: TrainDirection | null = null;
  const directionField = readStringField(raw.direction);
  if (directionField.state === 'invalid') {
    return { status: 'invalid' };
  }
  if (directionField.state === 'present') {
    if (!TRAIN_DIRECTION_VALUES.has(directionField.value)) {
      return { status: 'invalid' };
    }
    direction = directionField.value as TrainDirection;
  }

  // Optional name* fields: when explicitly typed as non-string we reject the
  // whole link, but empty/absent strings simply leave the field null so a
  // stray `&ttnameroman=` doesn't break the URL.
  const optionalName = (
    field: unknown
  ): { ok: true; value: string | null } | { ok: false } => {
    const parsed = readStringField(field);
    if (parsed.state === 'invalid') {
      return { ok: false };
    }
    if (parsed.state === 'absent' || parsed.value.length === 0) {
      return { ok: true, value: null };
    }
    return { ok: true, value: parsed.value };
  };

  const nameRoman = optionalName(raw.nameRoman);
  const nameKatakana = optionalName(raw.nameKatakana);
  const nameChinese = optionalName(raw.nameChinese);
  const nameKorean = optionalName(raw.nameKorean);
  const nameRomanIpa = optionalName(raw.nameRomanIpa);

  if (
    !nameRoman.ok ||
    !nameKatakana.ok ||
    !nameChinese.ok ||
    !nameKorean.ok ||
    !nameRomanIpa.ok
  ) {
    return { status: 'invalid' };
  }

  const trainType: TrainTypeNested = {
    __typename: 'TrainTypeNested',
    name: nameField.value,
    color: normalizeColor(colorField.value),
    kind,
    direction,
    nameRoman: nameRoman.value,
    nameKatakana: nameKatakana.value,
    nameChinese: nameChinese.value,
    nameKorean: nameKorean.value,
    nameRomanIpa: nameRomanIpa.value,
    // nameIpa is no longer carried by deep links: Japanese TTS reads names from
    // kanji + nameKatakana, so an IPA override would have no effect. It remains a
    // required schema field, so it is explicitly null.
    nameIpa: null,
    // Server-owned identity / structural fields are explicitly null so the
    // override never carries stale or fabricated lineGroupId / typeId.
    id: null,
    typeId: null,
    groupId: null,
    line: null,
    lines: null,
    nameTtsSegments: null,
  };

  return { status: 'valid', trainType };
};
