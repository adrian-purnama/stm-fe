import { createContext, useState, useEffect } from "react";
import { isTokenExpired } from "./tokenUtils";

const UserContext = createContext();

const UserContextProvider = (props) => {
  const [user, setUser] = useState({
    email: null,
    role: null,
    isLoggedIn: false
  });

  // Initialize user state from localStorage on app start
  useEffect(() => {
    const userData = localStorage.getItem('asb-user');
    const token = localStorage.getItem('asb-token');
    
    if (userData && token) {
      try {
        // Check if token is expired
        if (isTokenExpired(token)) {
          console.log('Token expired, clearing user data');
          localStorage.removeItem('asb-user');
          localStorage.removeItem('asb-token');
          return;
        }
        
        const parsedUser = JSON.parse(userData);
        setUser({
          email: parsedUser.email,
          role: parsedUser.role,
          isLoggedIn: true
        });
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        // Clear invalid data
        localStorage.removeItem('asb-user');
        localStorage.removeItem('asb-token');
      }
    }
  }, []);

  const loginUser = (userData, token) => {
    localStorage.setItem('asb-token', token);
    localStorage.setItem('asb-user', JSON.stringify(userData));
    setUser({
      email: userData.email,
      role: userData.role,
      isLoggedIn: true
    });
  };

  const logoutUser = () => {
    localStorage.removeItem('asb-token');
    localStorage.removeItem('asb-user');
    setUser({
      email: null,
      role: null,
      isLoggedIn: false
    });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loginUser,
        logoutUser,
        setUser
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export { UserContext, UserContextProvider };
