const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/invitesController");
const chatcontroller = require("../controllers/chatcontroller");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/signin", authController.singin);
router.post("/google", authController.authGoogle);

// Protect all routes after this middleware
router.use(authController.protect);

// Invites
router.get("/getInvites", userController.getInvites);
router.post("/createInvite", userController.createInvite);
router.patch("/updateInvite", userController.updateInvite);
router.post("/deleteInvite", userController.deleteInvite);

// Chats
router.get("/getChats", chatcontroller.getChats);
router.delete("/deleteChat/:userID", chatcontroller.deleteChat);

module.exports = router;
