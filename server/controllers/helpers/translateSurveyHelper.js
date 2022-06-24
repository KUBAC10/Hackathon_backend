import async from 'async';

// helpers
import translate from '../../helpers/translate';

export default function translateSurveyHelper({ from, to, survey }) {
  try {
    const promises = [];

    // set translation flag
    survey.translation[to] = true;

    // TODO made 1 async function in 10 parallel translations
    // translation survey fields
    const surveyFields = ['name', 'description'];
    for (const field of surveyFields) {
      if (survey[field]) {
        promises.push(new Promise((resolve) => {
          translate(survey[field][from], { from, to }).then((result) => {
            survey[field][to] = result;
            resolve();
          });
        }));
      }
    }

    // translate sections
    for (const section of survey.surveySections) {
      // translation section fields
      const sectionFields = ['name', 'description'];
      for (const field of sectionFields) {
        if (section[field]) {
          promises.push(new Promise((resolve) => {
            translate(section[field][from], { from, to }).then((result) => {
              section[field][to] = result;
              resolve();
            });
          }));
        }
      }

      // translate survey items
      for (const surveyItem of section.surveyItems) {
        // set the same HTML as parent have if not present
        if (surveyItem.html && !surveyItem.html[to]) surveyItem.html[to] = surveyItem.html[from];

        // translate question, if present and question is not trend
        const question = surveyItem.question;
        if (question && !question.trend) {
          // translation question fields
          const fields = ['name', 'description', 'placeholder'];
          for (const field of fields) {
            if (question[field]) {
              promises.push(new Promise((resolve) => {
                translate(question[field][from], { from, to }).then((result) => {
                  question[field][to] = result;
                  resolve();
                });
              }));
            }
          }

          // set translation flag
          question.translation[to] = true;

          // translate question items
          if (['multipleChoice', 'checkboxes', 'dropdown'].includes(question.type)) {
            for (const item of question.questionItems) {
              promises.push(new Promise((resolve) => {
                translate(item.name[from], { from, to }).then((result) => {
                  item.name[to] = result;
                  resolve();
                });
              }));
            }
          }

          if (['multipleChoiceMatrix', 'checkboxMatrix'].includes(question.type)) {
            for (const item of [...question.gridRows, ...question.gridColumns]) {
              promises.push(new Promise((resolve) => {
                translate(item.name[from], { from, to }).then((result) => {
                  item.name[to] = result;
                  resolve();
                });
              }));
            }
          }

          if (
            ['linearScale', 'netPromoterScore', 'slider', 'thumbs'].includes(question.type) &&
            question.linearScale &&
            question.linearScale.fromCaption &&
            question.linearScale.toCaption
          ) {
            promises.push(new Promise((resolve) => {
              translate(question.linearScale.fromCaption[from], { from, to }).then((result) => {
                question.linearScale.fromCaption[to] = result;
                resolve();
              });
            }));

            promises.push(new Promise((resolve) => {
              translate(question.linearScale.toCaption[from], { from, to }).then((result) => {
                question.linearScale.toCaption[to] = result;
                resolve();
              });
            }));
          }
        }
      }
    }

    return new Promise((resolve, reject) => {
      async.parallelLimit(
        promises.map(p => callback => p.then(() => callback(null, true))), 10, (err) => {
          if (err) return reject(err);
          resolve(survey);
        });
    });
  } catch (e) {
    return Promise.reject(e);
  }
}
