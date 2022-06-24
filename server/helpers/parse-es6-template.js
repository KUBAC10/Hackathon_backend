import _ from 'lodash';

function get(path, obj, fb = `$\{${path}}`) {
  return path.split('.').reduce((res, key) => _.get(res, `${key}`, fb), obj);
}

function parseTpl(template, map, fallback) {
  return template.replace(/\$\{.+?}/g, (match) => {
    const path = match.substr(2, match.length - 3).trim();
    return get(path, map, fallback);
  });
}

export default parseTpl;
