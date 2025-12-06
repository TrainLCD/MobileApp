export const parenthesisRegexp = /\([^()]*\)/g;
export const alphabetOrNumberRegexp = /^[0-9a-zA-Z]*$/g;
export const japaneseRegexp = /[ぁ-ん]+|[ァ-ヴー]+|[一-龠]/;
export const webSocketUrlRegexp =
  /^(ws|wss):\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]{1,63}(?::\d+)?(?:\/[a-zA-Z0-9:?#/@\-._~%!$&'()*+,;=]*)?$/;
