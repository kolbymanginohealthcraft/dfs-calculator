import React from 'react';
import Navbar from '../../components/Navbar';
import '../styles/BasicLayout.css';

const BasicLayout = ({ children, rightPanel, navbar, fullWidth = false, expandedRight = false, showNavbar = true }) => {
  return (
    <div className="score-screen">
      {showNavbar && (navbar || <Navbar />)}
      
      <div className={`main-content ${fullWidth ? 'full-width' : ''} ${expandedRight ? 'expanded-right' : ''}`}>
        {!fullWidth ? (
          <>
            <div className="content-left">
              <div className="left-content-container">
                {children}
              </div>
            </div>
            
            <div className="content-right">
              {rightPanel}
            </div>
          </>
        ) : (
          <div className="content-full-width">
            {rightPanel}
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicLayout;
