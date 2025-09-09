import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import StartScoreScreen from './screens/StartScoreScreen';
import ExpectedScoreScreen from './screens/ExpectedScoreScreen';
import EndScoreScreen from './screens/EndScoreScreen';
import ResultsViewScreen from './screens/ResultsViewScreen';

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

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/start-score" element={<StartScoreScreen />} />
        <Route path="/expected-score" element={<ExpectedScoreScreen />} />
        <Route path="/end-score" element={<EndScoreScreen />} />
        <Route path="/results" element={<ResultsViewScreen />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <AppRoutes />
      </div>
    </Router>
  );
}

export default App;
