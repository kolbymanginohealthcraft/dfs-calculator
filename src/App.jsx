import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeScreen from './components/HomeScreen';
import BasicApp from './components/BasicApp';
import AdvancedAppNew from './components/AdvancedAppNew';
import FAQ from './components/FAQ';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/basic/*" element={<BasicApp />} />
          <Route path="/advanced" element={<AdvancedAppNew />} />
          <Route path="/faq" element={<FAQ />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
