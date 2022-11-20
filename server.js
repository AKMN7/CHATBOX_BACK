const mongoose = require("mongoose");
const dotenv = require("dotenv");

// Shut Down Server In case of an Uncaught Exception
process.on("uncaughtException", (err) => {
	console.log("*** UNCAUGHT EXCEPTION! SHUTING DOWN...***");
	console.log(err);
	process.exit(1);
});

// Import Enviroment Variables
dotenv.config({ path: "./config.env" });
const server = require("./app");

// DB Connection String
const DB = process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD);

// DB Connector
mongoose
	.connect(DB, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log("*** DATABASE CONNECTED ... ***"));

// Initialize Server
const appPort = process.env.PORT || 3000;

server.listen(appPort, () => {
	console.log(`*** APP RUNNING ON PORT ${appPort} ... ***`);
});

// Shut Down Server In Case of a Unhandled Rejection
process.on("unhandledRejection", (err) => {
	console.log("*** UNCAUGHT REJECTION! SHUTING DOWN...***");
	console.log(err.name, err.message);
	server.close(() => {
		process.exit(1);
	});
});
