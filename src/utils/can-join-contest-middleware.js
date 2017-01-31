import deap from 'deap';
import * as contestMethods from '../route/contest/methods';

export default (...states) => {
  
  return (req, res, next) => {
    let user = req.user;
    if (!user) {
      return next(new HttpError('You have no permissions', 403));
    }
    return contestMethods.canJoin(
      Object.assign(req.params, { user: req.user })
    ).then(canJoinResult => {
      req.canJoin = canJoinResult;
      return states.every(state => canJoinResult[ state ]);
    }).then(result => {
      if (!result) {
        return next(new HttpError('You have no permissions', 403));
      }
      return next();
    }).catch(error => next(error));
  };
}