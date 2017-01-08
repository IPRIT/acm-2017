import userGroups from './../models/User/userGroups';
import deap from 'deap';

export default (...groups) => {
  let options = {
    public: false
  };
  if (groups.length) {
    let lastObject = groups[ groups.length - 1 ];
    if (typeof lastObject === 'object' && !lastObject.mask) {
      deap.update(options, lastObject);
      groups.pop();
    }
  }
  let defaultGroups = [ 'admin' ];
  let requestedMask = userGroups.utils.grouping(defaultGroups, ...groups);

  return (req, res, next) => {
    req.requestedMask = requestedMask;
    req.isPublic = options.public;
    if (options.public) {
      return next();
    }
    let loggedInUser = req.user;
    if (!loggedInUser) {
      return next(new HttpError('You are not logged in', 401));
    } else if (!loggedInUser.hasRight(requestedMask)) {
      return next(new HttpError('You have no permissions', 403));
    }
    next();
  };
}