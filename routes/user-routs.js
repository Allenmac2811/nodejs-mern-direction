const express = require("express");
const { check } = require("express-validator");
const router = express.Router();

const UserController = require("../controllers/user-controller");
const fileUpload = require("../middleware/file-upload");

router.get("/", UserController.getUsers);

router.post(
  "/signup",
  fileUpload.single("image"),
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 5 }),
  ],
  UserController.signup
);

router.post("/login", UserController.login);

module.exports = router;
