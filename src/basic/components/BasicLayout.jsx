import React, { useState, useRef, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import html2pdf from "html2pdf.js";
import Navbar from '../../components/Navbar';
import ModeBanner from '../../components/ModeBanner';
import { lazy } from 'react';
const ExportView = lazy(() => import('../../components/ExportView'));
import '../styles/BasicLayout.css';

const BasicLayout = ({ 
  children, 
  rightPanel, 
  navbar, 
  fullWidth = false, 
  expandedRight = false, 
  showNavbar = true,
  // Progress indicator props
  currentStep,
  onStepPress,
  startTotal,
  expectedScore,
  endTotal,
  hasInteracted,
  mode = 'basic',
  // Export props
  exportData
}) => {
  const location = useLocation();
  const [exportState, setExportState] = useState(null);
  const exportRef = useRef();

  const isBasicEndScore = location.pathname === '/basic/end-score';

  const handleExport = () => {
    if (!exportState) return;
    
    // Generate a sequence number based on timestamp
    const timestamp = Date.now();
    const sequenceNumber = timestamp.toString().slice(-6); // Use last 6 digits for shorter filename
    
    html2pdf()
      .set({
        margin: 0.5,
        filename: `dfs-basic-${sequenceNumber}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
      })
      .from(exportRef.current)
      .save();
  };

  // Update export state when exportData changes
  React.useEffect(() => {
    if (exportData && isBasicEndScore) {
      setExportState(exportData);
    }
  }, [exportData, isBasicEndScore]);

  // Create navbar with export functionality for basic end score
  const navbarWithExport = isBasicEndScore && exportState ? (
    <Navbar onExport={handleExport} />
  ) : navbar;
  return (
    <div className="score-screen">
      {showNavbar && (navbarWithExport || <Navbar />)}
      {!navbar && (
        <ModeBanner 
          currentStep={currentStep}
          onStepPress={onStepPress}
          startTotal={startTotal}
          expectedScore={expectedScore}
          endTotal={endTotal}
          hasInteracted={hasInteracted}
          mode={mode}
        />
      )}
      
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

      {/* Hidden Export View for Basic App */}
      {isBasicEndScore && exportState && (
        <div style={{ display: "none" }}>
          <div ref={exportRef}>
            <Suspense fallback={<div>Loading...</div>}>
              <ExportView
                patient={exportState.patient}
                scores={exportState.scores}
                mobilityType={exportState.mobilityType}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasicLayout;
