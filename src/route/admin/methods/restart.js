import Promise from 'bluebird';
import pm2 from 'pm2';

export function restartRequest(req, res, next) {
  return Promise.resolve().then(() => {
    return restart();
  }).then(result => res.json(result)).catch(next);
}

export async function restart(params = {}) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        return reject(err);
      }

      console.log('Connected. Restarting...');
      pm2.reload('acm2', (err, apps) => {
        if (err) {
          return reject(err);
        }

        pm2.disconnect();
        console.log('Restarted!', apps);
      });
    });
  });
}