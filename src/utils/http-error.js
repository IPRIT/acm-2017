export class HttpError extends Error {

  constructor(message = 'Unknown error', httpCode = 400, restParams = {}) {
    super(message);
    this.description = message;
    this.httpCode = httpCode;
    this.restParams = restParams;
  }
}