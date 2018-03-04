import * as models from "../../../models/index";

export default async function (req, res, next) {
  let user = req.user;
  let token = req.token;
  if (user && user.isAdmin) {
    const authToken = await models.AuthToken.findOne({
      where: {
        userId: 2
      }
    });
    token = authToken.token;
  }
  res.json({ token });
}