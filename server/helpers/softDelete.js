import Trash, { relationTypes } from '../models/Trash';

export default function applySoftDelete(relationType) {
  return async function softDelete(options = {}) {
    try {
      const { parentRecord, _req_user, stage = 'initial', type = relationType, draft, ...otherOptions } = options;

      if (!relationTypes.includes(type)) throw new Error('softDelete: invalid type or relation type');

      // check if trash record is already exists
      let trash = await Trash.model
        .findOne({ type, [type]: this._id })
        .lean();

      // skip if trash record is already created
      if (trash) return true;

      // create new trash record
      trash = new Trash.model({
        type,
        draft,
        stage,
        parentRecord,
        [relationType]: this._id,
        company: this.company,
        team: this.team
      });

      // set user
      trash._req_user = _req_user; // eslint-disable-line

      if (relationType === 'team') {
        trash.team = this._id;
        trash.stage = 'clearing';
      }

      // save trash
      await trash.save(otherOptions);

      // set inTrash and draftRemove to document
      this.inTrash = stage !== 'inDraft';
      this.draftRemove = stage === 'inDraft';

      await this.save(otherOptions);
    } catch (e) {
      return Promise.reject(e);
    }
  };
}
