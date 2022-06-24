import chalk from 'chalk';
import async from 'async';

// models
import { Trash } from '../models';

export default async function clearTrash() {
  try {
    // find initial items that already expired and set clearing stage
    const initialItems = await Trash.model
      .find({ expireDate: { $lte: new Date() }, stage: 'initial' })
      .limit(1000);

    for (const initialItem of initialItems) {
      initialItem.stage = 'clearing';
      await initialItem.save();
    }

    // find clearing items and init clearing
    const clearingItems = await Trash
      .model
      .find({
        stage: 'clearing', // find clearing items
        attempts: { $lt: 20 } // only with <20 attempts
      });

    await async.eachLimit(clearingItems, 5, (item, cb) =>
      item.clear()
        .then(cb)
        .catch((er) => {
          cb(); // skip error handling
          console.error(chalk.red(`Clear trash error: ${er}, trash id: ${item._id}`));
        })
    );

    console.log(chalk.green(`Cleared ${clearingItems.length} trash items`));
  } catch (e) {
    console.error(chalk.red(`Clear trash error: ${e}`));
  }
}
