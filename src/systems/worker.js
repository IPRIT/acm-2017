import Promise from 'bluebird';

const timeFrameMs = 1 * 1000;

let interval;

export function run() {
  stop();
  interval = setInterval(task, timeFrameMs);
}

export function stop() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function task() {
  return Promise.resolve().then(() => {
    return _task();
  }).catch(console.error.bind(console));
}

function _task() {
  //console.log('Tick');
}