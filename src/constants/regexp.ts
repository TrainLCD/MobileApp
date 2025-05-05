export const parenthesisRegexp = /\([^()]*\)/g;
export const alphabetOrNumberRegexp = /^[0-9a-zA-Z]*$/g;
export const japaneseRegexp = /[ぁ-ん]+|[ァ-ヴー]+|[一-龠]/;
export const urlRegexp =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
