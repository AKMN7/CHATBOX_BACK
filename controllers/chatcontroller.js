const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Message = require("../models/messageModel");

exports.getChats = catchAsync(async (req, res, next) => {
	// Get User's friend list info
	let result = await User.find({ _id: { $in: req.user.friends } });

	// Fromat Result
	let chats = {};
	for (const el of result) {
		chats[el.id] = {
			name: el.name,
			profilePic: el.profilePic,
			messages: await getChatMessages(req.user._id, el.id),
		};
	}

	res.status(200).json({
		status: "success",
		data: {
			chats,
		},
	});
});

const getChatMessages = async (userID, chatID) => {
	let messages = await Message.find({
		$or: [
			{ to: userID, from: chatID },
			{ to: chatID, from: userID },
		],
	});

	let result = [];
	messages.forEach((el) => {
		result.push({ ...el.toObject(), selfSend: el.from == userID ? true : false });
	});

	return result;
};

exports.deleteChat = catchAsync(async (req, res, next) => {
	// Check if user has the specified chat friend
	if (!req.user.friends.includes(req.params.userID)) return next(new AppError("Unauthorized Action", 401));

	// Update Users' Friend List and delete all message that occurd bettween them
	await Promise.all([
		User.findByIdAndUpdate(req.user._id, { $pull: { friends: req.params.userID } }),
		User.findByIdAndUpdate(req.params.userID, { $pull: { friends: req.user._id } }),
		Message.deleteMany({
			$or: [
				{ to: req.user._id, from: req.params.userID },
				{ to: req.params.userID, from: req.user._id },
			],
		}),
	]);

	res.status(204).json({
		status: "success",
		data: null,
	});
});
