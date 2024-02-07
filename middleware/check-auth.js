const HttpError = require("../Models/http-error");
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    const token = req.headers.authorization.split(" ")[1]; //Authorization: Bearer TOKEN
    if (!token) {
      throw new Error("Authorization Failed!!");
    }
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    req.userData = { userId: decodedToken.userId, token: token };
    next();
  } catch (error) {
    const err = new HttpError("Authorization Failed", 401);
    return next(err);
  }
};
