const User = require('../models/userModel');
const { promisify } = require('util');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client();

// Sign A Json Web Token (JWT)
const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};


// Create A Json Web Token (JWT)
const createToken = (user, statusCode, res, specialMSG = null) => {
    const token = signToken(user._id);

    // Remove Password from output
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        specialMSG,
        token,
        data: {
            user
        }
    });
};


// Sign Up a new User
exports.signup = catchAsync(async (req, res, _) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        source: 'local'
    });

    createToken(newUser, 201, res);
});


// Login User
exports.singin = catchAsync(async (req, res, next) => {

    const { email, password } = req.body;

    // Check if Email and Passwrod is Provided
    if (!email || !password) return next(new AppError('Please Provide Email and Password!', 400));
    // Check if the User exists
    const user = await User.findOne({ email }).select('+password');
    // Check Password
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Invalid Credentials', 401));
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
            source: 'google',
            googleID: userinfo.data.sub,
            profilePic: userinfo.data.picture
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
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // No Token Provided
    if (!token) return next(new AppError('Sign In Please', 401));

    // Verfiy Token
    let decoded
    try {
        decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    } catch (error) {
        return next(new AppError('Token Unauthorized!', 401));
    }

    // Find User 
    const currentUser = await User.findById(decoded.id);

    // Grant Access
    req.user = currentUser;
    next();
});