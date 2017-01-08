import deap from 'deap';
import { typeCheck as isType } from 'type-check';
import { ensureValue } from "./utils";

export default (obj, filterOptions) => {
  if (!obj || typeof obj !== 'object') {
    return {};
  } else if (!filterOptions) {
    return obj;
  }
  return filter(obj, filterOptions);
}

function filter(obj, attrs) {
  //todo: needs to entirely rewrite
  let [ include, exclude, replace, deep ] = [ [], [], [], false ];
  if (typeof attrs === 'object') {
    include = attrs.include || [];
    exclude = attrs.exclude || [];
    replace = attrs.replace || [];
    deep = attrs.deep || false;
  } else if (Array.isArray(attrs)) {
    include = attrs;
  } else if (typeof attrs === 'string') {
    include = attrs.split(',');
  } else {
    return obj;
  }
  let newObj = {};
  if (include.length) {
    include.forEach(attr => {
      if (obj.hasOwnProperty(attr)) {
        let isObject = isType('Object', obj[ attr ]);
        let isArray = isType('Array', obj[ attr ]);
        if (deep) {
          if (isArray) {
            deap.extend(newObj, {
              [ attr ]: obj[ attr ].map(
                value => isType('Object', value) ? filter(value, attrs) : value
              )
            });
          } else if (isObject) {
            deap.extend(newObj, {
              [ attr ]: filter(obj[ attr ], attrs)
            });
          } else {
            //todo: what?
            newObj[ attr ] = obj[ attr ];
          }
        } else {
          //todo: what?
          newObj[ attr ] = obj[ attr ];
        }
      }
    });
  } else {
    //todo: again?
    Object.keys(obj).forEach(attr => {
      let isObject = isType('Object', obj[ attr ]);
      let isArray = isType('Array', obj[ attr ]);
      if (deep) {
        if (isArray) {
          deap.extend(newObj, {
            [ attr ]: obj[ attr ].map(
              value => isType('Object', value) ? filter(value, attrs) : value
            )
          });
        } else if (isObject) {
          deap.extend(newObj, {
            [ attr ]: filter(obj[ attr ], attrs)
          });
        } else {
          //todo: what?
          newObj[ attr ] = obj[ attr ];
        }
      } else {
        //todo: what?
        newObj[ attr ] = obj[ attr ];
      }
    });
  }
  if (exclude.length) {
    exclude.forEach(attr => {
      if (newObj.hasOwnProperty(attr)) {
        delete newObj[ attr ];
      }
    });
  }
  replace.forEach(replaceOption => {
    let [
      from, to, fn = () => {},
      fromValue = newObj[ from ]
    ] = replaceOption;
    if (isType('Undefined', fromValue)) {
      return;
    }
    let toValue = fn(fromValue);
    deap.extend(newObj, {
      [ to ]: ensureValue(toValue, '^(Undefined)', fromValue)
    });
    if (to !== from) {
      delete newObj[ from ];
    }
  });
  return newObj;
}