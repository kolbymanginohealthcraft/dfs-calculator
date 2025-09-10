import React from 'react';
import Navbar from '../../components/Navbar';
import '../styles/BasicLayout.css';

const BasicLayout = ({ children, rightPanel }) => {
  return (
    <div className="score-screen">
      <Navbar />
      
      <div className="main-content">
        <div className="content-left">
          <div className="left-content-container">
            {children}
          </div>
        </div>
        
        <div className="content-right">
          {rightPanel}
        </div>
      </div>
    </div>
  );
};

export default BasicLayout;
