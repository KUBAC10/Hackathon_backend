import _ from 'lodash';
import parse from 'csv-parse';
import httpStatus from 'http-status';
import { isEmail, isMobilePhone } from 'validator';

// models
import {
  Contact,
  Tag,
  TagEntity,
  SurveyCampaign
} from '../../../models';

// helpers
import handleScopes from '../../helpers/handleScopes';
import APIError from '../../../helpers/APIError';
import { initSession } from '../../../helpers/transactions';

/** POST /api/v1/contacts/import/csv */
async function importCSV(req, res, next) {
  try {
    // check and load tags
    const { tags = [], distributeId } = req.body;

    let tagsDocs = [];
    let campaignDoc;

    if (tags.length) {
      tagsDocs = await Tag.model.find({ _id: { $in: tags } });
    }

    if (distributeId) {
      const campaignQuery = { _id: distributeId };

      handleScopes({ reqScopes: req.scopes, query: campaignQuery });

      campaignDoc = await SurveyCampaign.model.findOne({ _id: distributeId });

      if (!campaignDoc) return res.sendStatus(httpStatus.FORBIDDEN);

      // apply tags to distribute on import
      if (tagsDocs.length) {
        const { tags = [] } = campaignDoc;

        campaignDoc.tags = _.uniq(_.concat(
          tags.map(i => i.toString()),
          tagsDocs.map(i => i._id.toString())
        ));
      }
    }

    // get csv file from buffer
    const csv = req.file.buffer.toString('utf8');
    const options = { delimiter: [';', ','] };
    const columnNames = ['FirstName', 'LastName', 'PhoneNumber', 'Email'];
    // parse rows
    parse(csv, options, async (err, data) => {
      /* istanbul ignore if */
      if (err) {
        const error = new APIError(
          'Error during file parsing, please check your file or use sample',
          httpStatus.BAD_REQUEST,
          true
        );
        return next(error);
      }

      const [columns, ...output] = data;

      if (!columns.every(c => columnNames.includes(c))) {
        return res.status(httpStatus.BAD_REQUEST)
          .send({ message: 'Your file has invalid columns' });
      }

      try {
        const errors = [];

        let row = 1;
        let created = 0;
        let updated = 0;

        for (const item of output) {
          const {
            Email: email,
            FirstName: first,
            LastName: last,
            PhoneNumber: phoneNumber
          } = item.reduce((acc, item, index) => ({
            ...acc,
            [columns[index]]: item
          }), {});

          if (!email) {
            errors.push(`${row}: Missing email value`);
            row += 1;
            continue; // eslint-disable-line
          }

          if (email && !isEmail(email)) {
            errors.push(`${row}: Wrong email format`);
            row += 1;
            continue; // eslint-disable-line
          }

          const query = { email: { $regex: `^${email}$`, $options: 'i' } };

          handleScopes({ reqScopes: req.scopes, query });
          // check if contact already in db
          let contact = await Contact.model.findOne(query);

          if (!contact) {
            // create new contact
            contact = new Contact.model({
              name: { first, last },
              email
            });

            handleScopes({ reqScopes: req.scopes, doc: contact });

            created += 1;
          } else {
            updated += 1;
          }

          if (first && first.length) contact.name.first = first;
          if (last && last.length) contact.name.last = last;
          if (phoneNumber && isMobilePhone(phoneNumber)) contact.phoneNumber = phoneNumber;

          contact._req_user = { _id: req.user._id };

          const session = await initSession();

          await session.withTransaction(async () => {
            await contact.save({ session });

            // add contacts to distribute
            if (campaignDoc && !tagsDocs.length) {
              campaignDoc.emails = _.uniq([
                ...campaignDoc.emails || [],
                contact.email
              ]);
            }

            // create tagEntities if present
            for (const tag of tagsDocs) {
              const exists = await TagEntity.model
                .findOne({ tag: tag._id, contact: contact._id })
                .lean();

              if (!exists) {
                const tagEntity = new TagEntity.model({
                  tag,
                  contact,
                  company: req.user.companyId,
                });

                tagEntity._req_user = { _id: req.user._id };

                await tagEntity.save({ session });
              }
            }
          });

          row += 1;
        }

        if (campaignDoc) await campaignDoc.save();

        return res.send({
          message: `${created} new contacts were added and ${updated} updated!`,
          errors
        });
      } catch (e) {
        /* istanbul ignore next */
        return next(e);
      }
    });
  } catch (e) {
    /* istanbul ignore next */
    return next(e);
  }
}

export default { importCSV };
