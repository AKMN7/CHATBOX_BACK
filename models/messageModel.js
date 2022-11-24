const mongoose = require("mongoose");

// Message Schema Layout
const messageSchema = new mongoose.Schema({
	from: {
		type: String,
		required: [true, "Please provide a sender!"],
	},
	to: {
		type: String,
		required: [true, "Please provide a recipent!"],
	},
	text: {
		type: String,
		required: [true, "Please provide message text!"],
	},
	date: {
		type: Number,
		required: [true, "Please provide message date!"],
	},
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
