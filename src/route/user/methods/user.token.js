import { filterEntity as filter } from '../../../utils';
import { ensureValue } from "../../../utils";

export default function (req, res, next) {
  res.json({
    token: req.token
  });
}