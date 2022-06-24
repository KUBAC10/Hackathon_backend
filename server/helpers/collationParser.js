export default function collationParser(locale) {
  if (!locale) return 'en'; // return default locale if not present

  switch (locale) {
    case 'zh-Hant': // return mongodb format for zh-Hant locale
      return 'zh_Hant';
    default:
      return locale;
  }
}
