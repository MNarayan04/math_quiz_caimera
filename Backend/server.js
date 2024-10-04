// Import necessary modules
const express = require("express"); // Web framework for Node.js
const http = require("http"); // Node's HTTP module
const socketIo = require("socket.io"); // WebSocket library for real-time communication
const mongoose = require("mongoose"); // MongoDB object modeling library
const cors = require("cors"); // Middleware for enabling CORS

// Define a Mongoose schema for User
const UserSchema = new mongoose.Schema({
  username: String, // Username of the user
  score: { type: Number, default: 0 }, // User's score, default is 0
});
const User = mongoose.model("User", UserSchema); // Create a User model from the schema

// Initialize Express application
const app = express();
// Create an HTTP server
const server = http.createServer(app);
// Initialize Socket.io on the server with CORS settings
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"], // Allow specified methods
    credentials: true,
  },
});

// Enable CORS for all incoming requests
app.use(cors({ origin: "*", credentials: true }));

// Variables to hold the current problem and its answer
let currentProblem = null;
let answer = null;
let problemLocked = false; // Indicates whether the current problem is locked

// Function to generate a new math problem
const generateProblem = () => {
  const num1 = Math.floor(Math.random() * 100); // Random number between 0-99
  const num2 = Math.floor(Math.random() * 100); // Random number between 0-99

  currentProblem = `${num1} + ${num2}`; // Create the problem string
  answer = (num1 + num2).toString(); // Calculate the answer and convert to string
  console.log(`Generated Problem: ${currentProblem}, Answer: ${answer}`); // Log the problem and answer
  return currentProblem; // Return the generated problem
};

// Function to broadcast the current problem to all connected clients
const broadcastProblem = () => {
  console.log(`Broadcasting Problem: ${currentProblem}`);
  io.emit("newProblem", { problem: currentProblem }); // Emit newProblem event with the current problem
};

// Handle Socket.io connections
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`); // Log the connected user's ID

  // Send the current problem to the newly connected user, if it exists
  if (currentProblem) {
    socket.emit("newProblem", { problem: currentProblem });
  }

  // Listen for submitted answers from users
  socket.on("submitAnswer", async ({ username, userAnswer }) => {
    if (problemLocked) return; // Ignore if the problem is locked
    if (userAnswer === parseFloat(answer)) { // Check if the answer is correct
      problemLocked = true; // Lock the problem
      io.emit("winner", { username }); // Notify everyone of the winner

      try {
        // Update the user's score in the database
        const updatedUser = await User.findOneAndUpdate(
          { username },
          { $inc: { score: 1 } }, // Increment score by 1
          { new: true, upsert: true } // Return the new document, create if it doesn't exist
        );

        // Emit score update for the user
        io.emit("scoreUpdate", { username, score: updatedUser.score });

        // Emit leaderboard update
        io.emit("leaderboardUpdate");

        // Set a timeout to generate a new problem after 2 seconds
        setTimeout(() => {
          problemLocked = false; // Unlock the problem
          currentProblem = generateProblem(); // Generate a new problem
          broadcastProblem(); // Broadcast the new problem
        }, 2000);
      } catch (err) {
        console.log("Error updating score:", err); // Log any errors
        socket.emit("error", {
          message: "Failed to update your score. Please try again later.", // Send error message to user
        });
      }
    } else {
      // Notify the user if their answer was incorrect
      socket.emit("incorrectAnswer", { username });
    }
  });

  // Handle user disconnection
  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
  });
});

// Generate and broadcast the first problem after 1 second
setTimeout(() => {
  currentProblem = generateProblem();
  broadcastProblem();
}, 1000);

// Endpoint to get the leaderboard
app.get("/leaderboard", async (req, res) => {
  try {
    // Fetch top 10 users sorted by score
    const topUsers = await User.find().sort({ score: -1 }).limit(10);
    res.json(topUsers); // Send the leaderboard as a JSON response
  } catch (err) {
    // Handle any errors
    res.status(500).json({ error: "Failed to retrieve leaderboard" });
  }
});

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/maths-test") // MongoDB connection string
  .then(() => console.log("Connected to MongoDB")) // Log success message
  .catch((err) => console.error("MongoDB connection error:", err)); // Log error message if connection fails

// Set the port for the server to listen on
const PORT = process.env.PORT || 5000; // Use environment port or default to 4000
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Log server running message
});
