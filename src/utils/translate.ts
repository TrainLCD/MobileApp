import i18n from 'i18n-js';
import { TranslatedText } from '../constants';
import translations from '../translations';

i18n.translations = translations;

const getTranslatedText = (text: TranslatedText): string => i18n.t(text);

export default getTranslatedText;
