import React, { useState, useEffect } from "react";
import { useSocket } from "./SocketProvider";

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const socket = useSocket();

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(
        `${
          process.env.REACT_APP_BACKEND_URL || "http://localhost:"
        }/leaderboard`
      );
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    if (!socket) return;

    socket.on("leaderboardUpdate", () => {
      console.log("Leaderboard update received");
      fetchLeaderboard();
    });

    socket.on("newWinner", () => {
      console.log("New winner found");
      fetchLeaderboard();
    });

    return () => {
      socket.off("leaderboardUpdate");
      socket.off("newWinner");
    };
  }, [socket]);

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.length > 0 ? (
            leaderboard.map((user, index) => (
              <tr key={user.username}>
                <td>{index + 1}</td>
                <td>{user.username}</td>
                <td>{user.score}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">Loading leaderboard...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
