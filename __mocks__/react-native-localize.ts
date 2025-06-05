const getLocales = () => [
  {
    countryCode: 'JP',
    languageTag: 'ja-JP',
    languageCode: 'ja',
    isRTL: false,
  },
  {
    countryCode: 'US',
    languageTag: 'en-US',
    languageCode: 'en',
    isRTL: false,
  },
]

// use a provided translation, or return undefined to test your fallback
const findBestAvailableLanguage = () => ({
  languageTag: 'ja-JP',
  isRTL: false,
})
const findBestLanguageTag = () => ({
  languageTag: 'ja-JP',
  isRTL: false,
})

const getNumberFormatSettings = () => ({
  decimalSeparator: '.',
  groupingSeparator: ',',
})

const getCalendar = () => 'gregorian' // or "japanese", "buddhist"
const getCountry = () => 'US' // the country code you want
const getCurrencies = () => ['USD', 'EUR'] // can be empty array
const getTemperatureUnit = () => 'celsius' // or "fahrenheit"
const getTimeZone = () => 'Europe/Paris' // the timezone you want
const uses24HourClock = () => true
const usesMetricSystem = () => true

const addEventListener = jest.fn()
const removeEventListener = jest.fn()

export {
  findBestAvailableLanguage,
  findBestLanguageTag,
  getLocales,
  getNumberFormatSettings,
  getCalendar,
  getCountry,
  getCurrencies,
  getTemperatureUnit,
  getTimeZone,
  uses24HourClock,
  usesMetricSystem,
  addEventListener,
  removeEventListener,
}
