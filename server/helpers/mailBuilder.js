import mailcomposer from 'mailcomposer';
import _ from 'lodash';
import fs from 'fs';
import juice from 'juice';
import striptags from 'striptags';
import mailGun from '../../config/mailgun';
import parseTpl from './parse-es6-template';
import userEmailLoader from '../helpers/userEmailLoader';

import config from '../../config/env';

// models
import { Email, GlobalConfig } from '../models';

// import bootstrap as string
const root = config.root;
const bootstrap = fs.readFileSync(`${root}/helpers/bootstrap.min.css`, 'utf8');

export default async function mailBuilder(params, callback) {
  const {
    data, mailer, to, user, save, attachment, attachments,
    token, type, lang, company, _req_user
  } = params;

  try {
    // process template variables
    let parsedTemplate = parseTpl(mailer.template, data, '');

    // process template bootstrap css to inline css
    parsedTemplate = juice.inlineContent(parsedTemplate, bootstrap);

    // process subject variables
    const parsedSubject = parseTpl(mailer.subject, data, '');

    // get receiver address
    const receiverAddress = to || await userEmailLoader(user);

    // get app config
    const appConfig = await GlobalConfig.model.findOne({});

    // init mail body
    const mailBody = {
      from: `${appConfig.emailSenderName} <noreply@mg.screver.com>`,
      to: receiverAddress,
      subject: parsedSubject,
      html: parsedTemplate,
      text: striptags(parsedTemplate)
    };

    // apply attachments
    if (attachment) {
      mailBody.attachments = [
        {
          filename: attachment.filename,
          content: new Buffer(attachment.binary)
        }
      ];
    }

    if (attachments && attachments.length) {
      mailBody.attachments = attachments;
    }

    const mail = mailcomposer(mailBody);

    return await new Promise((resolve, reject) => {
      mail.build((mailBuildError, message) => {
        const dataToSend = {
          to: receiverAddress,
          message: message.toString('ascii')
        };

        mailGun.messages().sendMime(dataToSend, async (sendError, body) => {
          try {
            if (sendError) {
              console.error(sendError);
              return reject(sendError);
            }

            console.log(body);

            if (save) {
              let email = new Email.model({ // eslint-disable-line new-cap
                token,
                user,
                lang,
                type,
                company,
                to: receiverAddress,
                mailer,
                data: JSON.stringify(data, null, 4),
              });

              if (attachment) email.attachment = _.omit(attachment, ['binary']);

              email._req_user = _req_user; // eslint-disable-line

              email = await email.save();
              if (callback) callback(null, email);
              return resolve(email);
            }

            if (callback) callback();
            resolve();
          } catch (e) {
            return reject(e);
          }
        });
      });
    });
  } catch (e) {
    return callback ? callback(e) : Promise.reject(e);
  }
}
