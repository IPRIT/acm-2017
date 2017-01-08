import crypto from 'crypto';
import Promise from 'bluebird';

function generateCryptoToken(bufferLength = 48) {
  let getRandomBytes = Promise.promisify(crypto.randomBytes);
  return getRandomBytes(bufferLength).then(buffer => {
    return buffer.toString('hex');
  });
}

export function rememberUser(user) {
  return generateCryptoToken().then(token => {
    return user.createAuthToken({ token });
  });
}