import React, { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import MoveHistory from "./MoveHistory";
import io from "socket.io-client";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function ChessBoard() {
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);
  const [winner, setWinner] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [color, setColor] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [boardWidth, setBoardWidth] = useState(650);
  const [players, setPlayers] = useState({
    white: { username: "Opponent", userId: null, elo: 1200 },
    black: { username: "Opponent", userId: null, elo: 1200 },
  });
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);
  const [drawRequested, setDrawRequested] = useState(false);
  const [drawRequestFrom, setDrawRequestFrom] = useState(null);
  const [gameEndReason, setGameEndReason] = useState(null);
  const [eloChange, setEloChange] = useState(0);
  const [showEloAnimation, setShowEloAnimation] = useState(false);
  const socket = useRef(null);
  const containerRef = useRef(null);

  // Resize board logic
  useEffect(() => {
    const updateBoardWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = Math.min(650, containerWidth - 32);
        setBoardWidth(newWidth);
      }
    };

    window.addEventListener("resize", updateBoardWidth);
    updateBoardWidth();

    return () => window.removeEventListener("resize", updateBoardWidth);
  }, []);

  // Safe game mutation function
  function safeGameMutate(modify) {
    setGame((g) => {
      const update = new Chess(g.fen());
      modify(update);
      return update;
    });
  }

  // Socket connection and game setup
  useEffect(() => {
    socket.current = io("http://localhost:3000", {
      withCredentials: true,
    });

    const userId = localStorage.getItem("userId");
    
    // First check if this is a reconnection
    socket.current.emit("checkReconnection", { userId });
    
    socket.current.on("reconnected", ({ room, color, fen, players }) => {
      setRoom(room);
      setColor(color);
      setIsConnected(true);
      setGame(new Chess(fen));
      
      // Set player usernames and ELO
      const whitePlayers = players.find((p) => p.color === "w");
      const blackPlayers = players.find((p) => p.color === "b");

      setPlayers({
        white: {
          username: whitePlayers.username,
          userId: whitePlayers.userId,
          elo: whitePlayers.elo || 1200,
        },
        black: {
          username: blackPlayers.username,
          userId: blackPlayers.userId,
          elo: blackPlayers.elo || 1200,
        },
      });
    });
    
    socket.current.on("notReconnected", () => {
      // If not a reconnection, proceed with normal join
      socket.current.emit("joinGame", userId);
    });

    // Add beforeunload event to warn user before refreshing
    const handleBeforeUnload = (e) => {
      if (isConnected && !gameOver) {
        e.preventDefault();
        e.returnValue = "Refreshing will count as resignation. Are you sure?";
        return e.returnValue;
      }
    };
    
    window.addEventListener("beforeunload", handleBeforeUnload);

    socket.current.on("assignColor", (assignedColor) => {
      setColor(assignedColor);
    });

    socket.current.on("roomAssigned", (assignedRoom) => {
      setRoom(assignedRoom);
    });

    socket.current.on("startGame", ({ fen, players }) => {
      setIsConnected(true);
      setGame(new Chess(fen));

      // Set player usernames and ELO
      const whitePlayers = players.find((p) => p.color === "w");
      const blackPlayers = players.find((p) => p.color === "b");

      setPlayers({
        white: {
          username: whitePlayers.username,
          userId: whitePlayers.userId,
          elo: whitePlayers.elo || 1200,
        },
        black: {
          username: blackPlayers.username,
          userId: blackPlayers.userId,
          elo: blackPlayers.elo || 1200,
        },
      });
    });

    socket.current.on("move", ({ move, san }) => {
      safeGameMutate((gameInstance) => {
        gameInstance.move(move);
      });
      setHistory((prevHistory) => [...prevHistory, san]);
      
      // Check for game ending conditions after receiving a move
      checkGameEndingConditions();
    });

    socket.current.on("playerResigned", ({ winner }) => {
      handleGameOver(winner, "Resignation");
    });

    socket.current.on("gameOver", ({ winner, reason }) => {
      handleGameOver(winner, reason);
    });

    socket.current.on("playerDisconnected", ({ winner }) => {
      handleGameOver(winner, "Disconnection");
    });

    // Handle draw request
    socket.current.on("drawRequested", ({ from }) => {
      setDrawRequestFrom(from);
      setShowDrawConfirm(true);
    });

    // Handle draw accepted
    socket.current.on("drawAccepted", ({ reason }) => {
      handleGameOver("Draw", reason);
    });

    // Handle draw declined
    socket.current.on("drawDeclined", () => {
      setDrawRequested(false);
      // Show a notification that the draw was declined
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      notification.textContent = 'Draw offer declined';
      document.body.appendChild(notification);
      
      // Remove notification after 3 seconds
      setTimeout(() => {
        notification.remove();
      }, 3000);
    });

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      socket.current.disconnect();
    };
  }, []);

  // Function to check for game ending conditions
  function checkGameEndingConditions() {
    // Don't check if game is already over
    if (gameOver) return;
    
    // Check for checkmate
    if (game.in_checkmate()) {
      const winnerColor = game.turn() === "w" ? "Black" : "White";
      handleGameOver(winnerColor, "Checkmate");
      socket.current.emit("gameOver", { winner: winnerColor, room, reason: "Checkmate" });
      return;
    }
    
    // Check for stalemate
    if (game.in_stalemate()) {
      handleGameOver("Draw", "Stalemate");
      socket.current.emit("gameOver", { winner: "Draw", room, reason: "Stalemate" });
      return;
    }
    
    // Check for threefold repetition
    if (game.in_threefold_repetition()) {
      console.log("Threefold repetition detected");
      handleGameOver("Draw", "Threefold Repetition");
      socket.current.emit("gameOver", { winner: "Draw", room, reason: "Threefold Repetition" });
      return;
    }
    
    // Check for insufficient material
    if (game.insufficient_material()) {
      handleGameOver("Draw", "Insufficient Material");
      socket.current.emit("gameOver", { winner: "Draw", room, reason: "Insufficient Material" });
      return;
    }
  }

  // Handle game over logic
  function handleGameOver(winnerColor, reason) {
    const whiteMoves = history.filter((_, idx) => idx % 2 === 0);
    const blackMoves = history.filter((_, idx) => idx % 2 !== 0);
    const playerWhite = players.white.userId;
    const playerBlack = players.black.userId;

    const gameResult = {
      playerWhite,
      playerBlack,
      moves: {
        whiteMoves,
        blackMoves,
      },
      winner: winnerColor,
      additionalAttributes: {
        duration: Math.floor(performance.now() / 1000),
        reason: reason
      },
    };

    axios
      .post("http://localhost:3000/game/saveGameResult", gameResult)
      .then(() => console.log("Game result saved successfully"))
      .catch((err) => console.error("Error saving game result:", err));

    setWinner(winnerColor);
    setGameEndReason(reason);
    setGameOver(true);
    setIsConnected(false);
    
    // Calculate ELO change - this is only for display purposes
    // The actual ELO update is handled by the server
    if (winnerColor === "Draw") {
      setEloChange(0);
    } else {
      // Determine if the current player won
      const playerWon = (color === "w" && winnerColor === "White") || 
                        (color === "b" && winnerColor === "Black");
      
      // Set the correct ELO change value based on win/loss
      const eloChangeValue = playerWon ? 100 : -100;
      setEloChange(eloChangeValue);
    }
    
    // Show ELO animation
    setShowEloAnimation(true);
  }

  function handleResign() {
    if (gameOver) return;
    
    const winnerColor = color === "w" ? "Black" : "White";
    socket.current.emit("playerResigned", { winner: winnerColor, room });
    handleGameOver(winnerColor, "Resignation");
  }

  function handleDrawRequest() {
    if (gameOver || drawRequested) return;
    
    setDrawRequested(true);
    socket.current.emit("drawRequest", { 
      room,
      from: {
        color,
        userId: color === "w" ? players.white.userId : players.black.userId,
        elo: color === "w" ? players.white.elo : players.black.elo
      }
    });
  }

  function handleDrawResponse(accept) {
    setShowDrawConfirm(false);
    
    if (accept) {
      socket.current.emit("drawResponse", { 
        room, 
        accepted: true,
        requesterElo: drawRequestFrom.elo,
        responderElo: color === "w" ? players.white.elo : players.black.elo,
        requesterColor: drawRequestFrom.color,
        responderColor: color
      });
      handleGameOver("Draw", "Draw Accepted");
    } else {
      socket.current.emit("drawResponse", { 
        room, 
        accepted: false,
        requesterColor: drawRequestFrom.color,
        responderColor: color
      });
    }
    
    setDrawRequestFrom(null);
  }

  // Move handling functions
  function onDrop(sourceSquare, targetSquare) {
    makeMove(sourceSquare, targetSquare);
  }

  function onSquareClick(square) {
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn() && piece.color === color) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      const newLegalMoves = moves.map((move) => move.to);
      setLegalMoves(newLegalMoves);
    } else if (selectedSquare && legalMoves.includes(square)) {
      makeMove(selectedSquare, square);
      setSelectedSquare(null);
      setLegalMoves([]);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }

  function makeMove(sourceSquare, targetSquare) {
    if (game.turn() !== color) return;
    if (gameOver) return;

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    };

    const result = game.move(move);
    if (result === null) return;

    socket.current.emit("move", { move, room });
    setHistory((prevHistory) => [...prevHistory, result.san]);

    // Check for game ending conditions after making a move
    checkGameEndingConditions();
  }

  // Custom square styling
  const customSquareStyles = {};
  if (selectedSquare) {
    customSquareStyles[selectedSquare] = {
      backgroundColor: "rgba(255, 255, 0, 0.4)",
    };
    legalMoves.forEach((sq) => {
      customSquareStyles[sq] = {
        backgroundColor: "rgba(0, 255, 0, 0.4)",
      };
    });
  }

  // Restart game function to reuse in both button click and keyboard handler
  const restartGame = () => {
    setGame(new Chess());
    setHistory([]);
    setWinner(null);
    setGameOver(false);
    setIsConnected(false);
    setDrawRequested(false);
    setDrawRequestFrom(null);
    setSelectedSquare(null);
    setLegalMoves([]);
    setGameEndReason(null);
    setEloChange(0);
    setShowEloAnimation(false);
    socket.current.emit("joinGame", localStorage.getItem("userId"));
  };

  // Restart game on Enter key
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Enter" && gameOver) {
        restartGame();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver]);

  // Loading state
  if (!color || (!isConnected && !gameOver)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-8 text-center">
          <div className="animate-spin mb-6 mx-auto w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          <div className="text-xl md:text-2xl font-bold text-indigo-800">
            Waiting for an opponent...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row items-start justify-center min-h-screen bg-gradient-to-br from-indigo-100 to-purple-200 p-3 sm:p-6 gap-6 lg:gap-8">
      <div className="w-full lg:w-auto flex flex-col items-center">
        <div 
          ref={containerRef}
          className="w-full lg:w-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out"
        >
          <div className="flex justify-between items-center px-4 py-3 bg-indigo-600 text-white">
            <div className="text-base sm:text-lg font-medium">
              {color === "w" ? players.black.username : players.white.username}
              <span className="ml-2 text-sm bg-indigo-800 px-2 py-0.5 rounded-full">
                ELO: {color === "w" ? players.black.elo : players.white.elo}
              </span>
            </div>
          </div>
          
          <div className="relative">
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              customSquareStyles={customSquareStyles}
              boardOrientation={color === "b" ? "black" : "white"}
              boardWidth={boardWidth}
            />
            {gameOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm text-white z-50">
                <div className="text-center space-y-4 p-8 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl backdrop-blur-sm animate-fade-in-down max-w-sm mx-auto shadow-2xl border border-indigo-500/30">
                  <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    Game Over
                  </div>
                  <div className="text-xl text-indigo-200 font-medium">
                    {winner === "Draw" ? "Result: Draw" : 
                      (winner === (color === "w" ? "White" : "Black") ? 
                        "Result: You Won" : 
                        "Result: You Lost")}
                  </div>
                  <div className="text-lg text-indigo-300 font-medium">
                    {gameEndReason && `By ${gameEndReason}`}
                  </div>
                  
                  {/* Enhanced ELO Change Animation */}
                  <div className="mt-4 flex justify-center items-center">
                    <div className="text-xl font-bold relative p-4">
                      <div className="animate-fadeIn">
                        {color === "w" ? players.white.elo : players.black.elo}
                      </div>
                      {showEloAnimation && (
                        <span 
                          className={`ml-2 inline-flex items-center ${
                            winner === (color === "w" ? "White" : "Black") ? 'text-green-400' : 
                            winner !== "Draw" ? 'text-red-400' : 
                            'text-yellow-400'
                          } ${winner !== "Draw" ? 'animate-customPulse' : ''} animate-glowEffect`}
                        >
                          {winner === (color === "w" ? "White" : "Black") ? '+100' : 
                           winner !== "Draw" ? '-100' : '0'}
                        </span>
                      )}
                      {showEloAnimation && (
                        <div 
                          className="mt-2 text-white text-2xl font-bold animate-slideUp"
                        >
                          = {(color === "w" ? players.white.elo : players.black.elo) + 
                             (winner === (color === "w" ? "White" : "Black") ? 100 : 
                              winner !== "Draw" ? -100 : 0)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={restartGame}
                      className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-all text-white font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Play Again
                    </button>
                    <button
                      onClick={() => {
                        const role = localStorage.getItem("role");
                        console.log("User role from localStorage:", role);
                        
                        // Default to player route if role is missing or not recognized
                        if (!role || (role !== "coach" && role !== "admin")) {
                          console.log("Navigating to /Index?role=player (default)");
                          navigate("/Index?role=player");
                        } else if (role === "player") {
                          console.log("Navigating to /Index?role=player");
                          navigate("/Index?role=player");
                        } else {
                          console.log(`Navigating to /Index, role was ${role}`);
                          navigate("/Index");
                        }
                      }}
                      className="px-5 py-2.5 bg-purple-500 hover:bg-purple-600 rounded-lg transition-all text-white font-medium shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                      </svg>
                      Back to Home
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Resignation confirmation modal */}
            {showResignConfirm && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl p-6 max-w-xs w-full shadow-2xl border border-indigo-100 animate-fade-in">
                  <div className="flex items-center mb-4 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-800">Confirm Resignation</h3>
                  </div>
                  <p className="text-gray-600 mb-6">Are you sure you want to resign? This will count as a loss.</p>
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => setShowResignConfirm(false)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 transition-colors shadow-sm hover:shadow"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        setShowResignConfirm(false);
                        handleResign();
                      }}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors shadow-sm hover:shadow"
                    >
                      Resign
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Draw confirmation modal */}
            {showDrawConfirm && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-6 max-w-xs w-full shadow-2xl border border-blue-100 animate-fade-in">
                  <div className="flex items-center mb-4 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-800">Draw Offer</h3>
                  </div>
                  <p className="text-gray-600 mb-6">Your opponent has offered a draw. Do you accept?</p>
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => handleDrawResponse(false)}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-800 transition-colors shadow-sm hover:shadow"
                    >
                      Decline
                    </button>
                    <button 
                      onClick={() => handleDrawResponse(true)}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors shadow-sm hover:shadow"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Draw requested indicator */}
            {drawRequested && !showDrawConfirm && !gameOver && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-full text-sm shadow-lg animate-pulse z-40 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Draw offered - waiting for response
              </div>
            )}
          </div>
          
          <div className="flex justify-between items-center px-4 py-3 bg-indigo-600 text-white">
            <div className="text-base sm:text-lg font-medium">
              {color === "w" ? players.white.username : players.black.username} (You)
              <span className="ml-2 text-sm bg-indigo-800 px-2 py-0.5 rounded-full">
                ELO: {color === "w" ? players.white.elo : players.black.elo}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading state overlay */}
      {(!color || (!isConnected && !gameOver)) && (
        <div className="fixed inset-0 flex items-center justify-center bg-indigo-900/80 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md mx-auto animate-fade-in">
            <div className="animate-spin mb-6 mx-auto w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-800 mb-2">
              Finding an opponent...
            </div>
            <p className="text-gray-600">Please wait while we match you with another player</p>
          </div>
        </div>
      )}

      <div className="w-full lg:w-80 xl:w-96">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-5 h-full max-h-[calc(100vh-3rem)] overflow-y-auto">
          <h2 className="text-xl font-bold text-indigo-800 mb-4 border-b border-indigo-200 pb-2">Move History</h2>
          <MoveHistory 
            history={history} 
            onResign={() => setShowResignConfirm(true)}
            onDrawRequest={handleDrawRequest}
            gameOver={gameOver} 
          />
        </div>
      </div>
    </div>
  );
}

export default ChessBoard;
