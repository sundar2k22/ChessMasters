import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { clearUser } from '../redux/userSlice';
import { mihirBackend } from '../../config.js';

const LogoutButton = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      const response = await fetch(`${mihirBackend}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        dispatch(clearUser());
        navigate('/');
      } else {
        console.error('Error logging out');
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex-1 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base 
                 font-medium text-white bg-gradient-to-r from-red-400 to-red-700 
                 hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 
                 focus:ring-offset-2 focus:ring-red-500 transition duration-300 
                 ease-in-out transform hover:-translate-y-1 hover:scale-105"
    >
      Logout
    </button>
  );
};

const NavButton = ({ to, children }) => (
  <Link
    to={to}
    className="flex-1 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base 
               font-medium text-white bg-gradient-to-r from-orange-400 to-red-500 
               hover:from-orange-500 hover:to-red-600 focus:outline-none focus:ring-2 
               focus:ring-offset-2 focus:ring-orange-300 transition duration-300 
               ease-in-out text-center transform hover:-translate-y-1 hover:scale-105 
               relative overflow-hidden group whitespace-nowrap"
  >
    <span className="relative z-10">{children}</span>
    <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 
                     transition-opacity duration-300 ease-in-out">
    </span>
  </Link>
);

const Navbar = () => {
  const userId = useSelector((state) => state.user.userId);
  const logoSrc = "/pngtree-chess-rook-front-view-png-image_7505306-2460555070.png";

  return (
    <nav className="bg-purple-600 shadow-lg">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch">
          <div className="flex-shrink-0 flex items-center justify-center 
                        px-2 sm:px-3 md:px-4 py-2 sm:py-0
                        bg-purple-700 hover:bg-purple-800 transition-all duration-300">
            <img
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 
                       rounded-full transform hover:rotate-180 
                       transition-all duration-500"
              src={logoSrc}
              alt="Chess Logo"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row flex-grow">
            <NavButton to="/Index?role=player">Home</NavButton>
            <NavButton to="/CoachesAvailable">Coaches</NavButton>
            {userId && (
              <NavButton to={`/player/${userId}/profile`}>
                Profile
              </NavButton>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;