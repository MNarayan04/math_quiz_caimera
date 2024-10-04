import React, { useState, useEffect } from "react";
import { useSocket, SocketProvider } from "./SocketProvider";
import Leaderboard from "./Leaderboard";

function App() {
  const [problem, setProblem] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [username, setUsername] = useState("");
  const [winner, setWinner] = useState("");
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState(null);
  const [newWinnerFound, setNewWinnerFound] = useState(false);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("Connected to the server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from the server");
    });

    socket.on("newProblem", ({ problem }) => {
      console.log(`Received Problem: ${problem}`);
      setProblem(problem);
      setWinner("");
      setUserAnswer("");
      setIsCorrect(null);
      setNewWinnerFound(false);
    });

    socket.on("winner", ({ username }) => {
      setWinner(`${username} is the winner!`);
      setIsCorrect(true);
      setNewWinnerFound(true);
    });

    socket.on("incorrectAnswer", ({ username: incorrectUsername }) => {
      if (incorrectUsername === username) {
        setIsCorrect(false);
      }
    });

    socket.on(
      "scoreUpdate",
      ({ username: updatedUsername, score: updatedScore }) => {
        if (updatedUsername === username) {
          setScore(updatedScore);
        }
      }
    );

    return () => {
      socket.off("newProblem");
      socket.off("winner");
      socket.off("scoreUpdate");
      socket.off("incorrectAnswer");
    };
  }, [socket, username]);

  const isValidAnswer = (value) => {
    const regex = /^\d+$/;
    return regex.test(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (newWinnerFound) {
      return;
    }

    if (username.trim() === "") {
      alert("Please enter a username before submitting an answer.");
      return;
    }

    if (userAnswer !== "" && isValidAnswer(userAnswer)) {
      socket.emit("submitAnswer", {
        username,
        userAnswer: parseInt(userAnswer, 10),
      });
      setUserAnswer("");
    } else {
      alert("Please enter a valid whole number.");
    }
  };

  return (
    <div className="container">
      <div className="math-quiz">
        <h1>Math Quiz</h1>
        <h2>Current Problem: {problem ? problem : "Loading..."}</h2>

        {winner && <h3>{winner}</h3>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Your answer"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            disabled={newWinnerFound}
          />
          <button type="submit" disabled={newWinnerFound}>
            Submit Answer
          </button>
        </form>

        {isCorrect === false && (
          <p className="error-message">Incorrect answer, try again!</p>
        )}

        <h3>Your Score: {score}</h3>
      </div>
      <Leaderboard />
    </div>
  );
}

const AppWrapper = () => {
  return (
    <SocketProvider>
      <App />
    </SocketProvider>
  );
};

export default AppWrapper;
