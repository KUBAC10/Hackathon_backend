export default function sortByName(options = {}) {
  const { sort, query, lang } = options;
  // process for en lang
  if (lang === 'en') {
    query.sort = {
      'translation.en': -1,
      [`name.${lang}`]: sort.name,
      'translation.de': 1
    };
  }
  // process for de lang
  if (lang === 'de') {
    query.sort = {
      'translation.de': -1,
      [`name.${lang}`]: sort.name,
      'translation.en': 1
    };
  }
}
