import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import StartScoreScreen from '../basic/screens/StartScoreScreen';
import ExpectedScoreScreen from '../basic/screens/ExpectedScoreScreen';
import EndScoreScreen from '../basic/screens/EndScoreScreen';
import ResultsViewScreen from '../basic/screens/ResultsViewScreen';

// Component to scroll to top on route changes
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use setTimeout to ensure the scroll happens after the route change
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }, 0);
  }, [pathname]);

  return null;
}

function BasicApp() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<StartScoreScreen />} />
        <Route path="/start-score" element={<StartScoreScreen />} />
        <Route path="/expected-score" element={<ExpectedScoreScreen />} />
        <Route path="/end-score" element={<EndScoreScreen />} />
        <Route path="/results" element={<ResultsViewScreen />} />
      </Routes>
    </>
  );
}

export default BasicApp;
