const mongoose = require("mongoose");

// Invite Schema Layout
const inviteSchema = new mongoose.Schema({
	from: {
		type: String,
		required: [true, "Please provide a sender!"],
	},
	to: {
		type: String,
		required: [true, "Please provide a recipent!"],
	},
	status: {
		type: String,
		required: [true, "Please provide invite status!"],
		enum: ["pending", "approved", "declined"],
	},
	date: {
		type: Date,
		default: Date.now(),
	},
});

const Invite = mongoose.model("Invite", inviteSchema);

module.exports = Invite;
