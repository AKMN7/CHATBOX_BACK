const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cors = require("cors");

// Socket Controller
const socketController = require("./controllers/socketController");

// Utils
const AppError = require("./utils/appError");
const ErrorHandler = require("./utils/errorHandler");

// Application Route Handlers
const userRouter = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === "development") {
	app.use(morgan("dev"));
}

// Limit requests from same API
const limiter = rateLimit({
	max: 100,
	windowMs: 60 * 60 * 1000,
	message: "Too many requests from this IP, please try again in an hour!",
});

app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "1000kb" }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Overrule CORS protocol
app.use(cors());
app.options("*", cors());

app.use((_, res, next) => {
	res.header(
		"Access-Control-Allow-Headers, *, Access-Control-Allow-Origin",
		"Origin, X-Requested-with, Content_Type,Accept,Authorization",
		"http://127.0.0.1:5173"
	);
	next();
});

// PING ROUTE
app.get("/", (_, res, _1) => {
	res.status(200).json({ message: "TECHDOT IS READY TO GO" });
});

// APPLICATION ROUTES
app.use("/api/v1/users", userRouter);

// Unfound Route
app.all("*", (req, _, next) => {
	next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Application Error Handler
app.use(ErrorHandler);

//! SOCKET IO
const io = new Server(server, {
	cors: {
		origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
	},
});

// Protect Middleware
io.use(socketController.socketProtect);
io.on("connection", socketController.onConnection);

module.exports = server;
