import configReader from 'require-json5';
import deap from 'deap';

const config = { };
const defaultEnv = 'development';

let isInited = false;

function getConfig() {
  if (isInited) {
    return config;
  } else if (!process.env.NODE_ENV) {
    config.env = defaultEnv; //todo: remove when release
    throw new Error('NODE_ENV is not defined');
  } else if (!config.env) {
    config.env = process.env.NODE_ENV;
  }
  let postfix = config.env !== 'production'
    ? '.' + config.env : '';
  deap.extend(config,
    configReader(`config${postfix}.json`)
  );
  isInited = true;
  return config;
}

export default getConfig();