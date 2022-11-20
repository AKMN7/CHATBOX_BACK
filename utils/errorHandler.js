const AppError = require("./../utils/appError");

// Function that return our own AppError for errors with type CastError
const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
}

// Function that return our own AppError for errors with type 11000
const handleDuplicateFieldsDB = err => {
    const value = err.keyValue.name || err.keyValue.email;

    const message = `An account with the e-mail ${value} already exist. Plaease use another value!`;
    return new AppError(message, 400);
}

// Function that return our own AppError for errors with type ValidationError
const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);

    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
}

// Function that return our own AppError for errors with type JsonWebTokenError
const handleJWTerror = () => {
    const message = `Invalid Token, Please Log in Again!`;
    return new AppError(message, 401);
}

// Function that return our own AppError for errors with type TokenExpiredError
const handleJWTExpiredError = () => {
    const message = `You Token has Expired, Please Log in Again!`;
    return new AppError(message, 401);
}

// Function to send this type or error message to the user in the development mode
const sendDevERROR = (err, req, res) => {

    console.error('*** sendDevERROR ***', err);

    // A) Api Errors
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    }
};

// Function to send this type or error message to the user in the production mode
const sendProdERROR = (err, req, res) => {

    console.error('*** sendProdERROR ***', err);

    // A) Api Errors
    if (req.originalUrl.startsWith('/api')) {

        // Operational error that we created
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                msg: err.message
            });
        }
        return res.status(500).json({
            status: 'error',
            msg: 'Something went wrong'
        });

    }
}

module.exports = (err, req, res, _) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'Error';

    if (process.env.NODE_ENV === 'development') {
        sendDevERROR(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {

        let ourError = { ...err };
        ourError.message = err.message;

        if (err.name === 'CastError') ourError = handleCastErrorDB(ourError);
        if (err.code === 11000) ourError = handleDuplicateFieldsDB(ourError);
        if (err.name === 'ValidationError') ourError = handleValidationErrorDB(ourError);
        if (err.name === 'JsonWebTokenError') ourError = handleJWTerror();
        if (err.name === 'TokenExpiredError') ourError = handleJWTExpiredError();

        sendProdERROR(ourError, req, res);
    }
};