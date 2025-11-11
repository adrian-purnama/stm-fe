import { createContext, useState, useEffect } from "react";
import { isTokenExpired } from "../helpers/tokenUtils";

const UserContext = createContext();

const defaultUserState = {
  id: null,
  email: null,
  fullName: '',
  phoneNumbers: [],
  permissions: [],
  isLoggedIn: false
};

const UserContextProvider = (props) => {
  const [user, setUser] = useState(defaultUserState);

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
          id: parsedUser.id || parsedUser._id || null,
          email: parsedUser.email || null,
          fullName: parsedUser.fullName || '',
          phoneNumbers: parsedUser.phoneNumbers || [],
          permissions: parsedUser.permissions || [],
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

  const persistUser = (userData) => {
    localStorage.setItem('asb-user', JSON.stringify(userData));
    setUser(userData);
  };

  const loginUser = (userData, token) => {
    const normalizedUser = {
      id: userData.id || userData._id || null,
      email: userData.email || null,
      fullName: userData.fullName || '',
      phoneNumbers: userData.phoneNumbers || [],
      permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
      isLoggedIn: true
    };

    localStorage.setItem('asb-token', token);
    persistUser(normalizedUser);
  };

  const logoutUser = () => {
    localStorage.removeItem('asb-token');
    localStorage.removeItem('asb-user');
    setUser(defaultUserState);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loginUser,
        logoutUser,
        setUser: persistUser
      }}
    >
      {props.children}
    </UserContext.Provider>
  );
};

export { UserContext, UserContextProvider };
