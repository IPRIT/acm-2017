export default (isJsonRequest) => {
  return (req, res, next) => {
    req.isJsonRequest = isJsonRequest;
    next();
  };
}