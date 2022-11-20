const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/signin", authController.singin);
router.post("/google", authController.authGoogle);

// Protect all routes after this middleware
router.use(authController.protect);

router.get("/getInvites", userController.getInvites);
router.post("/createInvite", userController.createInvite);
router.patch("/updateInvite", userController.updateInvite);

module.exports = router;
