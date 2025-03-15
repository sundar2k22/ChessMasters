import React, { useState, useEffect, useRef } from 'react';
// import "../styles/profile.css";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios'; // For API requests


// const sampleData = [
//   { name: 'Game 1', elo: 400 },
//   { name: 'Game 2', elo: 820 },
//   { name: 'Game 3', elo: 790 },
//   { name: 'Game 4', elo: 1000 },
//   { name: 'Game 5', elo: 1250 }
// ];

const CProfile = () => {
  const { coachId } = useParams();
  const [isEditing, setIsEditing] = useState({ name: false, email: false, password: false });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '********'
  });
  const [eloData, setEloData] = useState([]);
  const [loading, setLoading] = useState(true); // For loading state
  const [subscribedPlayers, setSubscribedPlayers] = useState([]);

  // Fetch player details on component mount
  useEffect(() => {
    let isMounted = true;
  
    const fetchCoachDetails = async () => {
      const token = document.cookie.split("=")[1];
      try {
        const response = await axios.get('http://localhost:3000/auth/details', {
          withCredentials: true,
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isMounted) {
          const player = response.data;
          setFormData({
            name: player.UserName,
            email: player.Email,
            password: '********'
          });
          setEloData(player.eloHistory || []);
          setLoading(false);
  
          const playersResponse = await axios.get(
            `http://localhost:3000/coach/subscribedPlayers/${coachId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              withCredentials: true,
            }
          );
          console.log('playersResponse', playersResponse);
          if (isMounted) setSubscribedPlayers(playersResponse.data.subscribers);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching coach details:', error);
          setError('Failed to fetch data.');
          setLoading(false);
        }
      }
    };
  
    fetchCoachDetails();
  
    return () => {
      isMounted = false;
    };
  }, [coachId]);
  

  const handleEdit = (field) => {
    setIsEditing({ ...isEditing, [field]: !isEditing[field] });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Scroll Refs
  const scrollLeftRef = useRef(null);
  const scrollRightRef = useRef(null);
  const coachScrollContainerRef = useRef(null);

  // Scroll Handlers
  const scrollLeft = () => {
    if (coachScrollContainerRef.current) {
      coachScrollContainerRef.current.scrollLeft -= 100;
    }
  };

  const scrollRight = () => {
    if (coachScrollContainerRef.current) {
      coachScrollContainerRef.current.scrollLeft += 100;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-teal-50 to-cyan-100">
        <div className="text-lg sm:text-xl md:text-2xl font-semibold text-teal-800 animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto bg-yellow-50 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-6 md:p-8 lg:p-10">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 md:mb-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-teal-800 mb-4 sm:mb-0">Profile</h1>
            <Link to="/Index?role=coach" 
                  className="bg-teal-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full 
                           hover:bg-teal-700 transition duration-300 shadow-md hover:shadow-xl 
                           transform hover:-translate-y-1 text-sm sm:text-base">
              Home
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
            <div className="space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/1820405/profile/profile-512.jpg" 
                     alt={formData.name} 
                     className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-teal-400 shadow-lg" />
                <div className="text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-teal-800">{formData.name}</h2>
                  <p className="text-base sm:text-lg text-teal-600">Coach</p>
                </div>
              </div>

              {/* Form Fields */}
              {['name', 'email', 'password'].map((field) => (
                <div key={field} className="space-y-2">
                  <label className="block text-sm font-medium text-teal-700 capitalize">
                    {field}
                  </label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                    {isEditing[field] ? (
                      <input
                        type={field === 'password' ? 'password' : 'text'}
                        name={field}
                        value={formData[field]}
                        onChange={handleChange}
                        className="w-full sm:w-auto flex-grow mt-1 rounded-md border-teal-300 
                                 shadow-sm focus:border-teal-500 focus:ring focus:ring-teal-200 
                                 focus:ring-opacity-50 bg-teal-50 px-3 py-2 text-sm sm:text-base"
                      />
                    ) : (
                      <span className="text-base sm:text-lg text-teal-800">{formData[field]}</span>
                    )}
                    <button
                      onClick={() => handleEdit(field)}
                      className="px-4 py-2 bg-teal-100 text-teal-600 rounded-full hover:bg-teal-200 
                               transition duration-300 shadow-md hover:shadow-lg transform 
                               hover:-translate-y-1 text-sm sm:text-base w-full sm:w-auto"
                    >
                      {isEditing[field] ? 'Save' : 'Edit'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-64 sm:h-80 md:h-auto bg-lime-200 rounded-xl sm:rounded-2xl shadow-lg p-4">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={eloData}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e0f2f1" />
      <XAxis 
        dataKey="gameNumber" 
        stroke="#00897b" 
        label={{ 
          value: "Games", 
          position: "insideBottom", 
          offset: -5, 
          fill: "#00897b" 
        }} 
      />
      <YAxis 
        stroke="#00897b" 
        label={{ 
          value: "ELO", 
          angle: -90, 
          position: "insideLeft", 
          fill: "#00897b" 
        }} 
      />
      <Tooltip 
        contentStyle={{ 
          backgroundColor: '#e0f2f1', 
          borderColor: '#4db6ac' 
        }} 
      />
      <Legend />
      <Line 
        type="linear" // Ensures a straight line between points
        dataKey="elo" 
        stroke="#00897b" 
        strokeWidth={2} 
        dot={{ fill: '#4db6ac', strokeWidth: 2 }} 
        connectNulls={true} // Ensures null or missing values are connected
      />
    </LineChart>
  </ResponsiveContainer>
</div>


          </div>

{/* Subscribed Players Section */}
<div className="mt-8 sm:mt-12 md:mt-16">
  <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-4 sm:mb-6">
    Subscribed Players
  </h2>
  <div className="relative">
    <div 
      ref={coachScrollContainerRef} 
      className="flex overflow-x-auto space-x-4 sm:space-x-6 py-4 px-2 
        scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 
        hover:scrollbar-thumb-gray-400"
    >
      {subscribedPlayers.map((player) => (
        <div key={player._id} className="flex-none w-48 sm:w-56">
          <div className="bg-gray-100 rounded-lg p-4 transition duration-300 ease-in-out transform hover:scale-105">
            <img
              src={player.user.imageUrl || "/pngtree-chess-rook-front-view-png-image_7505306-2460555070.png"}
              alt={player.user.UserName}
              className="w-full h-32 sm:h-40 object-cover rounded-lg sm:rounded-xl"
            />
            <h3 className="text-base sm:text-xl text-center font-semibold text-gray-800 mt-2">{player.user.UserName}</h3>
            <p className="text-gray-600 text-center mb-1">{player.user.Email}</p>
            <p className="text-gray-600 text-center mb-4">ELO: {player.user.elo}</p>
            <button
              onClick={() => console.log(`Unsubscribing from ${player.user.UserName}`)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>

        </div>
      </div>
    </div>
  );
};

export default CProfile;