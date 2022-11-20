const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

// User Schema Layout
const userSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, "Please provide a name!"],
	},
	email: {
		type: String,
		required: [true, "Please provide an email!"],
		unique: true,
		lowercase: true,
		validate: [validator.isEmail, "Please provide a valid email!"],
	},
	password: {
		type: String,
		minlength: 8,
		select: false,
	},
	passwordConfirm: {
		type: String,
		validate: {
			validator: function (el) {
				return el === this.password && this.source === "local";
			},
			message: "Passwords provided are not the same!",
		},
	},
	source: {
		type: String,
		required: [true, "Source Not Specified!"],
		enum: ["local", "google"],
	},
	googleID: String,
	profilePic: String,
	friends: [
		{
			type: mongoose.Schema.ObjectId,
			ref: "User",
		},
	],
});

userSchema.pre("save", async function (next) {
	if (!this.isModified("password")) return next();

	this.password = await bcrypt.hash(this.password, 12);

	this.passwordConfirm = undefined;
});

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
	return bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
