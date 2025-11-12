import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const useSmartBackNavigation = (fallbackPath = '/') => {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const historyLength = typeof window !== 'undefined' ? window.history.length : 0;
    const fromState = location.state?.from;

    if (historyLength > 1) {
      navigate(-1);
      return;
    }

    if (fromState) {
      navigate(fromState, { replace: true });
      return;
    }

    navigate(fallbackPath, { replace: true });
  }, [navigate, fallbackPath, location.state]);
};

export default useSmartBackNavigation;






