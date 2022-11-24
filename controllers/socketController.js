const Message = require("../models/messageModel");
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

	socket.on("online", (data) => {
		// Send "I am Online" tp all of the users chats
		Object.keys(data).forEach((el) => {
			socket.to(el).emit("set-online", socket.userID);
		});
	});

	socket.on("chat-deleted", (id) => {
		socket.to(id).emit("delete-chat", socket.userID);
	});

	socket.on("send-msg", async (to, msgText, date) => {
		let msg = await Message.create({
			from: socket.userID,
			to: to,
			text: msgText,
			date,
		});

		socket.emit("recieve-msg", { ...msg.toObject(), selfSend: true });
		socket.to(msg.to).emit("recieve-msg", { ...msg.toObject(), selfSend: false });
	});
};
