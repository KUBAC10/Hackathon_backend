import sw from 'stopword';

const stopwords = [...sw.en, ...sw.de, ...sw.ru, ...sw.nl];

export default (input, { caseSensitive = false, minLength = 2, stopword = true } = {}) => {
  input = input.trim();
  if (!caseSensitive) input = input.toLowerCase();

  // split string on words array
  let output = input
    .trim()
    .replace(/'/g, '')
    .replace(/[^A-Za-zА-Яа-яçÇğĞıİöÖşŞüÜ0-9_]/g, ' ')
    .replace(/\s\s+/g, ' ')
    .split(' ')
    .filter(s => s.length > minLength);

  // remove grammatical words
  if (stopword) output = sw.removeStopwords(output, stopwords);

  output = output.reduce((acc, word) => ({ ...acc, [word]: (acc[word] || 0) + 1 }), {});

  return Object.keys(output)
    .map(item => ({ text: item, value: output[item] }))
    .filter(i => i.value >= 10)
    .sort((a, b) => {
      if (a.value < b.value) return 1;
      if (a.value > b.value) return -1;
      return 0;
    })
    .slice(0, 49);
};
