import fs from 'fs';
import path from 'path';

export default function removeFile(url, callback) {
  const oldImagePath = path.join(process.env.PWD, 'public', url);
  fs.stat(oldImagePath, (err) => {
    if (err) {
      console.error(err);
      return callback();
    }

    return fs.unlink(oldImagePath, (unlinkErr) => {
      if (unlinkErr) {
        callback(unlinkErr);
      } else {
        callback();
      }
    });
  });
}
