const catchAsync = require("../utils/catchAsync");
const Invite = require("../models/invitesModel");
const AppError = require("../utils/appError");
const User = require("../models/userModel");

exports.getInvites = catchAsync(async (req, res, next) => {
	const invites = await Invite.find({ $or: [{ from: req.user._id }, { to: req.user._id }], status: "pending" });

	let result = [];
	if (invites.length >= 1) {
		for (const el of invites) {
			if (el.from == req.user._id) {
				const user = await User.findById(el.to);

				result.push({
					id: el.id,
					data: {
						username: user.name,
						userImage: user.profilePic,
						status: "pending",
						selfSend: true,
					},
				});
			} else if (el.to == req.user._id) {
				const user = await User.findById(el.from);

				result.push({
					id: el.id,
					data: {
						username: user.name,
						userImage: user.profilePic,
						status: "pending",
						selfSend: false,
					},
				});
			}
		}
	}

	res.status(200).json({
		status: "success",
		data: {
			invites: result,
		},
	});
});

exports.createInvite = catchAsync(async (req, res, next) => {
	// Check user
	const toUser = await User.findOne({ email: req.body.to });
	if (!toUser) return next(new AppError("Unable to find a user with the same email.", 404));

	const invites = await Invite.findOne({ $or: [{ from: req.user._id }, { to: req.user._id }], status: "pending" });
	if (invites) return next(new AppError("Duplicate Invitations, Check your invitations inbox!"));

	const newInvite = await Invite.create({
		from: req.user._id,
		to: toUser.id,
		status: "pending",
	});

	res.status(201).json({
		status: "success",
		data: {
			invite: newInvite,
		},
	});
});

exports.updateInvite = catchAsync(async (req, res, next) => {
	const toUpdate = await Invite.findById(req.body.inviteID);

	// Check if the invite is there
	if (!toUpdate) return next(new AppError("Invite with the same ID was not found!"));
	// Check if the user is authorized
	if (toUpdate.to !== req.user._id) return next(new AppError("Unauthorized to update Invite!", 401));

	toUpdate.status = req.body.newStatus;
	await toUpdate.save();

	res.status(200).json({
		status: "success",
	});
});
