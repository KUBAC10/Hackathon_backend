import get from 'lodash/get';
import keystone from 'keystone';

import overrideDuplicateErrors from '../server/controllers/helpers/overrideDuplicateErrors';

const Types = keystone.Field.Types;

/** Setup localization config for each language in application */
const languages = [
  { name: 'en', label: 'English', isDefault: true },
  { name: 'de', label: 'German' },
  { name: 'fr', label: 'French' },
  { name: 'ru', label: 'Russian' },
  { name: 'nl', label: 'Dutch' },
  { name: 'it', label: 'Italian' },
  { name: 'ko', label: 'Korean' },
  { name: 'ja', label: 'Japanese' },
  { name: 'zh', label: 'Chinese' },
  { name: 'zh-Hant', label: 'Chinese (Traditional)' },
  { name: 'hr', label: 'Croatian' },
  { name: 'ro', label: 'Romanian' },
  { name: 'da', label: 'Danish' },
  { name: 'pt', label: 'Portuguese' },
  { name: 'cs', label: 'Czech' },
  { name: 'hu', label: 'Hungarian' },
  { name: 'fi', label: 'Finnish' },
  { name: 'es', label: 'Spanish' },
  { name: 'sv', label: 'Swedish' }
];

// TODO: Add more localized errors
const JoiErrors = {
  de: {
    key: '{{!!key}}',
    any: {
      empty: 'Darf nicht leer sein',
      required: 'Wird benötigt'
    },
    string: {
      min: 'Die Länge muss mindestens {{limit}} Zeichen lang sein',
      email: 'Muss eine gültige E-Mail sein'
    },
    number: {
      min: 'Muss größer oder gleich {{limit}} sein',
      max: 'Muss kleiner oder gleich {{limit}} sein'
    },
    crossingsRequired: 'Sie müssen mindestens einen Artikel hinzufügen.',
    surveyItemsRequired: 'Sie sollten dem Abschnitt mindestens ein Element hinzufügen',
    valueDuplicate: 'Doppelte Werte sind nicht zulässig',
    questionReusableType: 'Die Frage sollte zumindest allgemein oder tendenziell sein',
    startDate: 'Datum, an dem die Umfrage gestartet wird, muss eine gültige Datumszeichenfolge sein',
    endDate: 'Das Datum, an dem die Umfrage abgeschlossen ist, muss ein gültiger Datumsstring sein'
  },
  en: {
    key: '{{!!key}}',
    any: {
      required: 'Is required'
    },
    crossingsRequired: 'You should add at least one item.',
    surveyItemsRequired: 'You should add at least one item to section',
    valueDuplicate: 'Duplicate values are not allowed',
    questionReusableType: 'Question should be at least general or trend',
    startDate: 'Date when survey is started must be a valid date string',
    endDate: 'Date when survey is finished must be a valid date string',
  },
  nl: {
    key: '{{!!key}}',
  },
  fr: {
    key: '{{!!key}}',
    any: {
      empty: 'Ne doit pas être vide',
      required: 'Est requis'
    },
    string: {
      min: 'La longueur doit être d\'au moins {{limit}} caractères',
      email: 'Doit être un email valide'
    },
    number: {
      min: 'Doit être supérieur ou égal à {{limit}}',
      max: 'Doit être inférieur ou égal à {{limit}}'
    },
    crossingsRequired: 'Vous devriez ajouter au moins un élément',
    surveyItemsRequired: 'Vous devez ajouter au moins un élément à la section',
    valueDuplicate: 'Les valeurs en double ne sont pas autorisées',
    questionReusableType: 'La question devrait être au moins générale ou tendance',
    startDate: 'La date de début de l’enquête doit être une chaîne de date valide',
    endDate: 'La date à laquelle l’enquête est terminée doit être une chaîne de date valide'
  },
  ru: {
    key: '{{!!key}}',
    any: {
      required: 'Обязательно для заполнения'
    },
    crossingsRequired: 'Вы должны добавить хотя бы один элемент.',
    surveyItemsRequired: 'Необходимо добавить хотя бы один элемент в секцию',
    valueDuplicate: 'Дублирующиеся значения запрещены',
    questionReusableType: 'Вопрос должен быть - общим или трендовый',
    startDate: 'Дата начала опроса должна быть корректной',
    endDate: 'Дата окончания опроса должна быть корректной'
  },
  it: {
    key: '{{!!key}}',
    any: {
      required: 'È richiesto'
    },
    crossingsRequired: 'Devi aggiungere almeno un elemento.',
    surveyItemsRequired: 'Devi aggiungere almeno un elemento alla sezione',
    valueDuplicate: 'Non sono ammessi valori duplicati',
    questionReusableType: 'La domanda dovrebbe essere almeno generale o di tendenza',
    startDate: 'La data di inizio del sondaggio deve essere una stringa di date valida',
    endDate: 'La data al termine del sondaggio deve essere una stringa di date valida'
  },
  ko: {
    key: '{{!!key}}',
    any: {
      required: '필수'
    },
    crossingsRequired: '한 개 이상의 요소를 추가해야합니다.',
    surveyItemsRequired: '섹션에 하나 이상의 항목을 추가해야합니다',
    valueDuplicate: '중복 된 값은 허용되지 않습니다',
    questionReusableType: '질문은 일반적이거나 추세 여야합니다',
    startDate: '폴 시작 날짜가 정확해야합니다.',
    endDate: '조사 종료 날짜가 정확해야합니다'
  },
  ja: {
    key: '{{!!key}}',
    any: {
      required: '必須です'
    },
    crossingsRequired: '少なくとも1つのアイテムを追加する必要があります。',
    surveyItemsRequired: 'セクションに少なくとも1つのアイテムを追加する必要があります',
    valueDuplicate: '重複値は許可されません',
    questionReusableType: '質問は少なくとも一般的またはトレンドであるべきです',
    startDate: '調査を開始する日付は有効な日付文字列でなければなりません',
    endDate: '調査の終了日は有効な日付文字列でなければなりません',
  },
  zh: {
    key: '{{!!key}}',
    any: {
      required: '必填'
    },
    crossingsRequired: '您应该添加至少一项。',
    surveyItemsRequired: '您应该在部分中添加至少一项',
    valueDuplicate: '不允许重复的值',
    questionReusableType: '问题应该至少是一般性问题或趋势性问题',
    startDate: '调查开始的日期必须是有效的日期字符串',
    endDate: '调查完成的日期必须是有效的日期字符串',
  },
  'zh-Hant': {
    key: '{{!!key}}',
    any: {
      required: '必填'
    },
    crossingsRequired: '您應該添加至少一項。 ',
    surveyItemsRequired: '您應該在部分中添加至少一項',
    valueDuplicate: '不允許重複的值',
    questionReusableType: '問題應該至少是一般性問題或趨勢性問題',
    startDate: '調查開始的日期必須是有效的日期字符串',
    endDate: '調查完成的日期必須是有效的日期字符串',
  },
  hr: {
    key: '{{!!key}}',
    any: {
      required: 'Je li potrebno'
    },
    crossingsRequired: 'Trebali biste dodati barem jednu stavku.',
    surveyItemsRequired: 'U odjeljak trebate dodati barem jednu stavku',
    valueDuplicate: 'Duplicirane vrijednosti nisu dopuštene',
    questionReusableType: 'Pitanje bi trebalo biti barem općenito ili trend',
    startDate: 'Datum početka ankete mora biti važeći niz datuma',
    endDate: 'Datum kada je anketa završena mora biti važeći niz datuma'
  },
  ro: {
    key: '{{!!key}}',
    any: {
      required: 'Este necesară'
    },
    crossingsRequired: 'Ar trebui să adăugați cel puțin un articol.',
    surveyItemsRequired: 'Ar trebui să adăugați cel puțin un articol la secțiune',
    valueDuplicate: 'Valorile duplicate nu sunt permise',
    questionReusableType: 'Întrebarea ar trebui să fie cel puțin generală sau de tendință',
    startDate: 'Data la care începe sondajul trebuie să fie un șir de date valid',
    endDate: 'Data finalizării sondajului trebuie să fie un șir de date valid',
  },
  da: {
    key: '{{!!key}}',
    any: {
      required: 'Er påkrævet'
    },
    crossingsRequired: 'Du skal tilføje mindst et element.',
    surveyItemsRequired: 'Du skal tilføje mindst et element til sektionen',
    valueDuplicate: 'Dublerede værdier er ikke tilladt',
    questionReusableType: 'Spørgsmålet bør være mindst generelt eller trend',
    startDate: 'Dato, hvor undersøgelsen startes, skal være en gyldig datostreng',
    endDate: 'Dato, hvor undersøgelsen er færdig, skal være en gyldig datostreng',
  },
  pt: {
    key: '{{!!key}}',
    any: {
      required: 'É necessário'
    },
    crossingsRequired: 'Você deve adicionar pelo menos um item.',
    surveyItemsRequired: 'Você deve adicionar pelo menos um item à seção',
    valueDuplicate: 'Valores duplicados não são permitidos',
    questionReusableType: 'A pergunta deve ser pelo menos geral ou tendência',
    startDate: 'A data de início da pesquisa deve ser uma string de data válida',
    endDate: 'A data em que a pesquisa é concluída deve ser uma string de data válida',
  },
  cs: {
    key: '{{!!key}}',
    any: {
      required: 'Je požadováno'
    },
    crossingsRequired: 'Měli byste přidat alespoň jednu položku.',
    surveyItemsRequired: 'Do sekce byste měli přidat alespoň jednu položku',
    valueDuplicate: 'Duplicitní hodnoty nejsou povoleny',
    questionReusableType: 'Otázka by měla být alespoň obecná nebo trendová',
    startDate: 'Datum zahájení průzkumu musí být platným řetězcem data',
    endDate: 'Datum, kdy je průzkum dokončen, musí být platným řetězcem data',
  },
  hu: {
    key: '{{!!key}}',
    any: {
      required: 'Szükséges'
    },
    crossingsRequired: 'Legalább egy elemet hozzá kell adnia.',
    surveyItemsRequired: 'Legalább egy elemet hozzá kell adnia a szakaszhoz',
    valueDuplicate: 'Ismétlődő értékek nem megengedettek',
    questionReusableType: 'A kérdésnek legalább általánosnak vagy trendnek kell lennie',
    startDate: 'A felmérés megkezdésének dátumának érvényes dátumláncnak kell lennie',
    endDate: 'A felmérés befejezésének dátumának érvényes dátumláncnak kell lennie',
  },
  fi: {
    key: '{{!!key}}',
    any: {
      required: 'Vaaditaan'
    },
    crossingsRequired: 'Sinun tulee lisätä vähintään yksi kohde.',
    surveyItemsRequired: 'Sinun tulee lisätä vähintään yksi kohde osioon',
    valueDuplicate: 'Päällekkäiset arvot eivät ole sallittuja',
    questionReusableType: 'Kysymyksen tulee olla vähintään yleinen tai suuntaus',
    startDate: 'Kyselyn alkamispäivän on oltava kelvollinen päivämäärämerkkijono',
    endDate: 'Kyselyn päättymispäivän on oltava kelvollinen päivämäärämerkkijono',
  },
  es: {
    key: '{{!!key}}',
    any: {
      required: 'Es requerido'
    },
    crossingsRequired: 'Debe agregar al menos un elemento.',
    surveyItemsRequired: 'Debe agregar al menos un elemento a la sección',
    valueDuplicate: 'No se permiten valores duplicados',
    questionReusableType: 'La pregunta debe ser al menos general o de tendencia.',
    startDate: 'La fecha de inicio de la encuesta debe ser una cadena de fecha válida',
    endDate: 'La fecha de finalización de la encuesta debe ser una cadena de fecha válida',
  },
  sv: {
    key: '{{!!key}}',
    any: {
      required: 'Krävs'
    },
    crossingsRequired: 'Du bör lägga till minst ett objekt.',
    surveyItemsRequired: 'Du bör lägga till minst ett objekt i avsnittet',
    valueDuplicate: 'Dubblettvärden är inte tillåtna',
    questionReusableType: 'Frågan bör åtminstone vara generell eller trendmässig',
    startDate: 'Datum då undersökningen startas måste vara en giltig datumsträngg',
    endDate: 'Datum då undersökningen är klar måste vara en giltig datumsträng',
  }
};

// return list of all localization flags. Default goes first
const localizationList = languages
  .sort((a, b) => !!Number(b.isDefault) - !!Number(a.isDefault))
  .map(lang => lang.name);

// return object with keys by each lang and given values
const setKeys = value => languages.reduce((acc, lang) => ({ ...acc, [lang.name]: value }), {});

const nameSchema = (Joi) => {
  let base = Joi.object();

  languages.forEach((lang) => {
    base = base.when(`translation.${lang.name}`, {
      is: true,
      then: {
        [lang.name]: Joi.string().trim().max(500).required(),
      }
    });
  });

  return base;
};

const arrayItemSchema = (Joi, itemOptions = {}) => {
  let base = Joi.object({
    _id: Joi.string(),
    uuid: Joi.string(),
    deselectOtherOptions: Joi.boolean(),
    dataType: Joi.valid('cloudinary', 'unsplash', 'gallery', 'none'),
    imgCloudinary: Joi.alternatives([
      Joi.object().required(),
      Joi.string().required()
    ]),
    bgImage: Joi.string(),
    icon: Joi.string(),
    unsplashUrl: Joi.string(),
    translationLock: Joi.object()
      .keys(setKeys(Joi.boolean())),
    ...itemOptions
  });

  // pass languages conditions
  languages.forEach((lang) => {
    base = base.when(`translation.${lang.name}`, {
      is: true,
      then: {
        name: { [lang.name]: Joi.string().trim().required() },
      }
    });
  });

  return base;
};

const uniqField = field => (a, b) =>
  languages.reduce((acc, lang) => acc || (a[field][lang.name]
    && b[field][lang.name] && a[field][lang.name] === b[field][lang.name]), false);

// schema of question, grid items
const arraySchema = (Joi, itemOptions) =>
  Joi.array()
    .items(arrayItemSchema(Joi, itemOptions))
    .unique(uniqField('name'))
    .error(overrideDuplicateErrors);

const validationsSchema = Joi => ({
  general: {
    name: nameSchema(Joi),
    description: {
      key: Joi.string()
        .trim()
        .allow('')
    },
    translation: {
      key: Joi.boolean()
    },
    translationLockName: {
      key: Joi.boolean()
    },
    translationLockDescription: {
      key: Joi.boolean()
    }
  },

  // grids and question items
  itemsArray: arraySchema(Joi),

  // question items with quiz
  questionItemsQuiz: arraySchema(Joi, {
    // quiz
    quizCorrect: Joi.boolean(),
    // TODO check limit text length
    quizResultText: Joi.object(setKeys(Joi.string().allow('').trim().max(1000))),
    quizResultTextTranslationLock: Joi.object(setKeys(Joi.boolean())),
  }),

  // matrix with score
  gridColumnMatrixArray: arraySchema(
    Joi,
    { score: Joi.number().required() },
  ),
  survey: {
    text: {
      key: Joi.string()
        .trim()
        .allow('')
        .allow(null)
    },
    completeMsg: {
      key: Joi.string()
        .trim()
        .allow('')
        .max(500)
    },
    translationLockCompleteMsg: {
      key: Joi.boolean()
    }
  },
  surveyItem: {
    html: {
      key: Joi
        .htmlInput()
        .trim()
        .allow('')
        .allow(null)
    }
  },
  contentItem: {
    text: {
      key: Joi.string()
        .trim()
        .allow('')
    },
    html: {
      key: Joi
        .htmlInput()
        .trim()
        .allow('')
        .allow(null)
    }
  },
  question: {
    fromCaption: {
      key: Joi.string().allow(null, '')
        .trim()
    },
    toCaption: {
      key: Joi.string().allow(null, '')
        .trim()
    },
    placeholder: {
      key: Joi.string()
        .trim()
        .allow('')
    },
    translationLockLinearScaleFromCaption: {
      key: Joi.boolean()
    },
    translationLockLinearScaleToCaption: {
      key: Joi.boolean()
    }
  },
  questionItem: {
    quizResultText: {
      key: Joi.string()
        .allow('')
        .trim()
        .max(1000)
    }
  },
  mailers: {
    subject: {
      key: Joi.string()
        .trim()
        .allow('')
    },
    template: {
      key: Joi.string()
        .trim()
        .allow(''),
    }
  },
  globalConfig: {
    footer: {
      key: Joi.string()
    },
  }
});

function localizeValidations (Joi, key) {
  const opts = get(validationsSchema(Joi), key, '');
  if (!opts) throw new Error(`Wrong schema key - ${key}`);

  // set object keys
  if (opts.key) return languages.reduce((acc, lang) => ({ ...acc, [lang.name]: opts.key }), {});

  return opts;
}

// Schema of general or specific fields for each model
const modelsSchema = {
  general: {
    translation: {
      type: Boolean,
      initial: true
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: Types.Textarea,
      trim: true,
    },
    translationLock: {
      type: Boolean
    },
    translationLockName: {
      type: Boolean
    },
    translationLockDescription: {
      type: Boolean
    },
    html: {
      type: Types.Html,
      wysiwyg: true,
      initial: true,
    },
  },
  survey: {
    text: {
      type: Types.Textarea,
    },
    completeMsg: {
      type: Types.Textarea
    },
    translationLockCompleteMsg: {
      type: Boolean
    }
  },
  surveyItem: {
    html: {
      type: Types.Html,
      wysiwyg: true,
      initial: true,
    },
  },
  contentItem: {
    linkText: {
      type: String
    },
    text: {
      type: Types.Textarea,
    },
    html: {
      type: Types.Html,
      wysiwyg: true,
      initial: true,
    }
  },
  question: {
    fromCaption: {
      type: String,
      trim: true
    },
    toCaption: {
      type: String,
      trim: true
    },
    placeholder: {
      type: String,
      trim: true,
    },
    translationLockLinearScaleFromCaption: {
      type: Boolean
    },
    translationLockLinearScaleToCaption: {
      type: Boolean
    },
    translationLockPlaceholder: {
      type: Boolean
    }
  },
  mailer: {
    subject: {
      type: String
    },
    template: {
      type: Types.Html, wysiwyg: true,
    },
    smsTemplate: {
      type: Types.Textarea,
    },
  },
  globalConfig: {
    footer: {
      type: Types.Html,
      wysiwyg: true,
      initial: true,
    },
  },
  Faq: {
    article: {
      type: Types.Html,
      wysiwyg: true,
      initial: true,
      required: true,
    },
    name: {
      type: String,
      trim: true,
      initial: true,
      required: true
    }
  }
};

function localizeField (key, additionalOpts = {}) {
  const opts = get(modelsSchema, key, '');
  if (!opts) throw new Error(`Wrong schema key - ${key}`);

  // localize field
  return languages.reduce((acc, lang) => (
    { ...acc, [lang.name]: { ...opts, ...additionalOpts } }
  ), {});
}

export {
  localizeField,
  localizationList,
  localizeValidations,
  JoiErrors
};
