import Promise from 'bluebird';

export function filePipeRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return req.stream.file.pipe(res);
  }).catch(next);
}