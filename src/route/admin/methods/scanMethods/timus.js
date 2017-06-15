import * as socket from '../../../../socket';

export async function scanTimus(params) {
  let {
    insert, name, systemType, update
  } = params;

  let count = 0;
  let interval = setInterval(() => {
    socket.emitScannerConsoleLog(`${name}: ${systemType} ${count}`);
    if (count++ > 10) {
      socket.emitScannerConsoleLog(`finished`);
      clearInterval(interval);
    }
  }, 300);

  return params;
}