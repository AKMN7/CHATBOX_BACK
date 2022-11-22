const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getChats = catchAsync(async (req, res, next) => {
	// Get User's friend list info
	let chats = await User.find({ _id: { $in: req.user.friends } });

	// Fromat Result
	let result = [];
	chats.forEach((el) =>
		result.push({
			id: el.id,
			name: el.name,
			profilePic: el.profilePic,
		})
	);

	res.status(200).json({
		status: "success",
		data: {
			chats: result,
		},
	});
});

exports.deleteChat = catchAsync(async (req, res, next) => {
	// Check if user has the specified chat friend
	if (!req.user.friends.includes(req.params.userID)) return next(new AppError("Unauthorized Action", 401));

	// Update Users' Friend List
	await Promise.all([
		User.findByIdAndUpdate(req.user._id, { $pull: { friends: req.params.userID } }),
		User.findByIdAndUpdate(req.params.userID, { $pull: { friends: req.user._id } }),
	]);

	res.status(204).json({
		status: "success",
		data: null,
	});
});
