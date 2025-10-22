import axios from "axios";
import toast from "react-hot-toast";
import { isTokenExpired } from "./tokenUtils";

const axiosInstance = axios.create({
  // TODO : FIX THIS SHIT
  baseURL: "https://" + import.meta.env.VITE_BACKEND_URL,
  //baseURL: "http://" + import.meta.env.VITE_BACKEND_URL,
  // baseURL: import.meta.env.VITE_NODE_ENV === 'development' ? "http://" : "https://" + import.meta.env.VITE_BACKEND_URL,
  paramsSerializer: (params) => {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (Array.isArray(value)) {
        // Handle arrays with brackets format (similar to qs arrayFormat: "brackets")
        value.forEach(item => {
          searchParams.append(`${key}[]`, item);
        });
      } else if (value !== null && value !== undefined) {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("asb-token");
  
  if (token) {
    // Check if token is expired before sending request
    if (isTokenExpired(token)) {
      // Clear expired token
      localStorage.removeItem('asb-token');
      localStorage.removeItem('asb-user');
      
      // Show notification
      toast.error(
        "Session expired. Please log in again.",
        {
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#ffffff",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "16px",
            fontWeight: "500",
          },
          icon: "🔒",
        }
      );
      
      // Redirect to login
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
      
      // Reject the request
      return Promise.reject(new Error('Token expired'));
    }
    
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response, // if response is successful, just return it
  (error) => {
    // Handle token expiration (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      const errorMessage = error.response.data?.message || '';
      
      // Check if it's a token expiration error
      if (errorMessage.includes('expired') || errorMessage.includes('TokenExpiredError')) {
        // Clear token and user data from localStorage
        localStorage.removeItem('asb-token');
        localStorage.removeItem('asb-user');
        
        // Show user-friendly message
        toast.error(
          "Session expired. Please log in again.",
          {
            duration: 4000,
            style: {
              background: "#ef4444", // Red background for error
              color: "#ffffff",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "16px",
              fontWeight: "500",
            },
            icon: "🔒",
          }
        );
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        
        return Promise.reject(error);
      }
      
      // Handle other 401 errors (invalid token, etc.)
      if (errorMessage.includes('Invalid token') || errorMessage.includes('Access token required')) {
        // Clear token and user data from localStorage
        localStorage.removeItem('asb-token');
        localStorage.removeItem('asb-user');
        
        toast.error(
          "Authentication failed. Please log in again.",
          {
            duration: 4000,
            style: {
              background: "#ef4444",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "16px",
              fontWeight: "500",
            },
            icon: "🔒",
          }
        );
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        
        return Promise.reject(error);
      }
    }
    
    // Handle rate limiting (429)
    if (error.response && error.response.status === 429) {
      toast.error(
        "Whoa slow down there, too many request",
        {
          duration: 5000,
          style: {
            background: "#80cbc4", // Soft teal background for a calming effect
            color: "#ffffff", // White text for better contrast
            borderRadius: "8px", // Soft corners for a smooth feel
            padding: "12px", // Adequate padding to make it visually comfortable
            fontSize: "16px", // Slightly larger text for readability
            fontWeight: "500", // Medium weight for readability
          },
          icon: "💆‍♂️", // A soothing icon (optional, use an emoji for relaxation)
        }
      );
    }

    return Promise.reject(error); // Reject the promise for other errors
  }
);

export default axiosInstance;
