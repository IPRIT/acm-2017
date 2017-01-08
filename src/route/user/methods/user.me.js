import { filterEntity as filter } from '../../../utils';
import { ensureValue } from "../../../utils";

export default function (req, res, next) {
  let user = req.user;
  let queryParams = req.query;
  let fields = ensureValue(queryParams.fields, 'String', '', (actual, defaultValue) => {
    return actual.split(',')
      .map(field => field.trim())
      .filter(field => field.length);
  });
  let excludedFields = [ 'updatedAt', 'createdAt', 'isBan' ];

  res.json(filter(
    user.get({ plain: true }), {
      include: fields,
      exclude: excludedFields
    })
  );
}