import keystone from 'keystone';

export default async function applySetTrashStage(relationType) {
  return async function setTrashStage(options = {}) {
    try {
      const { Trash } = keystone.lists;
      const { session, undo } = options;

      const trash = await Trash.model.findOne({ [relationType]: this._id });

      if (trash.stage === 'clearing') return true;

      if (undo) return await trash.restore({ session });

      trash.stage = 'initial';

      this.inTrash = true;

      await Promise.all([
        this.save({ session }),
        trash.save({ session })
      ]);
    } catch (e) {
      return Promise.reject(e);
    }
  };
}
