const User = require("../models/userModel");
const Invite = require("../models/invitesModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getInvites = catchAsync(async (req, res, next) => {
	const invites = await Invite.find({ $or: [{ from: req.user._id }, { to: req.user._id }] });

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
						status: el.status,
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
						status: el.status,
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

	// const invites = await Invite.findOne({ $or: [{ from: req.user._id }, { to: req.user._id }], status: "pending" });
	const invites = await Invite.findOne({ from: req.user._id, to: toUser.id, status: "pending" });
	// console.log("invites->", invites);
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
	const toUpdate = await Invite.findOne({ _id: req.body.inviteID, status: "pending" });

	// console.log("req.body.inviteID", req.body.inviteID);
	// console.log("toUpdate.id", toUpdate.id);
	// console.log("toUpdate.to", toUpdate.to);
	// console.log("toUpdate.from", toUpdate.from);
	// console.log("req.user._id", req.user._id);

	// Check if the invite is there
	if (!toUpdate) return next(new AppError("Invite with the same ID was not found!"));
	// Check if the user is authorized
	if (toUpdate.to != req.user._id) return next(new AppError("Unauthorized to update Invite!", 401));

	toUpdate.status = req.body.newStatus;
	await toUpdate.save();

	if (req.body.newStatus === "approved") {
		// Update Users' Friend List
		await Promise.all([
			User.findByIdAndUpdate(toUpdate.to, { $push: { friends: toUpdate.from } }),
			User.findByIdAndUpdate(toUpdate.from, { $push: { friends: toUpdate.to } }),
		]);
	}

	res.status(200).json({
		status: "success",
	});
});

exports.deleteInvite = catchAsync(async (req, res, next) => {
	const toDelete = await Invite.findById(req.body.inviteID);

	// console.log("toDelete.from", toDelete.from);
	// console.log("req.user._id", req.user._id);

	// Check if the invite is there
	if (!toDelete) return next(new AppError("Invite with the same ID was not found!"));
	// Check if the user is authorized
	if (toDelete.from != req.user._id) return next(new AppError("Unauthorized to delete Invite!", 401));
	// Check if the status is changed from pending
	if (toDelete.status !== "pending")
		return next(new AppError("Invitations status recently changed, refresh to get the latest stauts"));

	await Invite.findByIdAndDelete(toDelete.id);

	res.status(204).json({
		status: "success",
		data: null,
	});
});
