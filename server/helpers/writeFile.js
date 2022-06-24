import fs from 'fs';

export default async function writeFile({ path, filename, binary }) {
  let binaryPath = `${process.env.PWD}${path}`;
  binaryPath = `${binaryPath}${filename}`;

  return new Promise((resolve, reject) => (
    fs.writeFile(binaryPath, binary, (err) => {
      if (err) return reject(err);
      resolve();
    })
  ));
}
