import Promise from 'bluebird';

const streamifier = require("streamifier");

export function filePipeRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return streamifier.createReadStream(req.file.buffer).pipe(res);
  }).catch(next);
}