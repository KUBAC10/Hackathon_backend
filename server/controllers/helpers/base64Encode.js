import fs from 'fs';

export default function base64Encode(file) {
  // read binary data
  const bitmap = fs.readFileSync(file);
  // convert binary data to base64 encoded string
  return new Buffer(bitmap).toString('base64');
}
