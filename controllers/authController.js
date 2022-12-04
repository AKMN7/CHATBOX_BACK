const User = require("../models/userModel");
const { promisify } = require("util");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client();
const multer = require("multer");
const AWS = require("aws-sdk");

// Sign A Json Web Token (JWT)
const signToken = (id) => {
	return jwt.sign({ id }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES_IN,
	});
};

// Create A Json Web Token (JWT)
const createToken = (user, statusCode, res, specialMSG = null) => {
	const token = signToken(user._id);

	// Remove Password from output
	user.password = undefined;

	res.status(statusCode).json({
		status: "success",
		specialMSG,
		token,
		data: {
			user,
		},
	});
};

// Sign Up a new User
exports.signup = catchAsync(async (req, res, _) => {
	const newUser = await User.create({
		name: req.body.name,
		email: req.body.email,
		password: req.body.password,
		passwordConfirm: req.body.passwordConfirm,
		source: "local",
		profilePic: generateAvatar(req.body.name),
		friends: [],
	});

	createToken(newUser, 201, res);
});

// Login User
exports.singin = catchAsync(async (req, res, next) => {
	const { email, password } = req.body;

	// Check if Email and Passwrod is Provided
	if (!email || !password) return next(new AppError("Please Provide Email and Password!", 400));
	// Check if the User exists
	const user = await User.findOne({ email }).select("+password");
	// Check Password
	if (!user || !(await user.correctPassword(password, user.password))) {
		return next(new AppError("Invalid Credentials", 401));
	}

	createToken(user, 201, res);
});

// Auth Google
exports.authGoogle = catchAsync(async (req, res, _) => {
	// Set the credentials of the user
	client.setCredentials({ access_token: req.body.token });
	// Obtain the user information for google auth library
	const userinfo = await client.request({ url: "https://www.googleapis.com/oauth2/v3/userinfo" });
	// Check if thes user Exists
	const existingUser = await User.findOne({ email: userinfo.data.email });

	if (!existingUser) {
		// Create a new user in case he does not exist
		const newUser = await User.create({
			name: userinfo.data.name,
			email: userinfo.data.email,
			source: "google",
			googleID: userinfo.data.sub,
			profilePic: userinfo.data.picture,
		});
		// Return JWT
		createToken(newUser, 201, res, "Sign Up Success");
	}

	if (existingUser && req.body.type == "SignUp") {
		createToken(existingUser, 201, res, "Already Signed Up, Signing you in.");
	} else if (existingUser && req.body.type == "SignIn") {
		createToken(existingUser, 201, res);
	}
});

// Protext Routes (Only availalbe for signed in users)
exports.protect = catchAsync(async (req, res, next) => {
	// Get Toke
	let token;
	if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
		token = req.headers.authorization.split(" ")[1];
	}

	// No Token Provided
	if (!token) return next(new AppError("Sign In Please", 401));

	// Verfiy Token
	let decoded;
	try {
		decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
	} catch (error) {
		return next(new AppError("Token Unauthorized!", 401));
	}

	// Find User
	const currentUser = await User.findById(decoded.id);

	// Grant Access
	req.user = currentUser;
	next();
});

// Helper Function to generate placeholder avatars
function generateAvatar(name) {
	let nameArr = name.trim().split(" ");
	let str = "";
	nameArr.forEach((el, ind) => {
		if (ind === nameArr.length - 1) str += el;
		else str += el + "+";
	});

	return `https://ui-avatars.com/api/?name=${str}&size=128&background=random`;
}

//! THE BELOW CODE IS USED TO STORE IMAGES IN AWS S3

// Storage Instance to upload file to a specified destination folder
const storage = multer.memoryStorage({
	destination: function (req, file, cb) {
		cb(null, "");
	},
});

// Check the type of the uploaded file
const fileFilter = (req, file, cb) => {
	if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
		cb(null, false);
	} else {
		cb(null, true);
	}
};

// Defining the upload varable for the configuration of the photo being uploaded
exports.upload = multer({
	storage: storage,
	fileFilter: fileFilter,
});

// S3 Instance, used to upload images to the S3 bucket
const s3 = new AWS.S3({
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
	},
});

exports.uploadProfilePic = catchAsync(async (req, res, next) => {
	const params = {
		Bucket: process.env.AWS_BUCKET_NAME,
		Key: `imgs/${req.user._id}`,
		Body: req.file.buffer,
		ACL: "public-read-write",
		ContentType: "image/jpeg",
	};

	s3.upload(params, async (error, data) => {
		if (error) return next(new AppError("Error Uploading Image", 500));

		await User.findByIdAndUpdate(req.user._id, { profilePic: data.Location });

		res.status(200).json({
			status: "success",
			newImage: data.Location,
		});
	});
});
