import _ from 'lodash';

// helpers
import getLocalizationFields from './getLocalizationFields';

// crop translate avoid custom language translate
export default function cropTranslation(cropObject, collection, language) {
  const fields = getLocalizationFields(collection);

  fields.forEach((element) => {
    let cloneElement = _.get(cropObject, element);

    cloneElement = _.pick(cloneElement, language);

    cropObject = _.set(cropObject, element, cloneElement);
  });

  return cropObject;
}
