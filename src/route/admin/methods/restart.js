import Promise from 'bluebird';
import * as pm2 from 'pm2';

export function restartRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return restart();
  }).then(result => res.json(result)).catch(next);
}

export async function restart(params = {}) {
  pm2.connect(function(err, a) {
    if (err) {
      console.error(err);
      return process.exit(2);
    }
    console.log('Connected. Restarting...');
    pm2.restart('acm2', function(err, apps) {
      pm2.disconnect();
      console.log('Restarted!');
    });
  });
}