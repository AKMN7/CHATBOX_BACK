// const User = require('../models/userModel');
const { promisify } = require("util");
const AppError = require("../utils/appError");
const jwt = require("jsonwebtoken");

exports.socketProtect = async (socket, next) => {
	// Validate Token
	if (!socket.handshake.auth.token) next(new Error("TOKEN INVALID OR MISSING"));

	// Verfiy Token
	let decoded = await promisify(jwt.verify)(socket.handshake.auth.token, process.env.JWT_SECRET);
	if (!decoded) next(new AppError("TOKEN INVALID OR MISSING!", 401));

	// Set the userID to the corresponding socket
	socket.userID = decoded.id;
	next();
};

exports.onConnection = (socket) => {
	socket.join(socket.userID); // Join The User to his room
	console.log(`*** User => ${socket.userID} Connected ***`);

	socket.on("send-msg", (msg) => {
		console.log("This is the message recieved", msg);
		console.log("typeof", socket.userID);
		console.log("typeof", msg.to);
		// socket.to(socket.userID).emit("recieve-msg", msg);
		socket.to(msg.to).to(socket.userID).emit("recieve-msg", msg);
	});
};
