import config from '../utils/config';
import cors from 'cors';

const env = config.env;

var corsOptions = {
  origin: config.cors.origins.join(' '),
  methods: config.cors.methods,
  allowedHeaders: config.cors.headers
};

export default cors(corsOptions);