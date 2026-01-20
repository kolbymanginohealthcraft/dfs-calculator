/**
 * Development-only component for testing authentication states
 * This component allows toggling between authenticated and unauthenticated states
 * for UI testing purposes.
 * 
 * Only visible in development mode.
 */

import React, { useState, useEffect } from 'react';
import { usePortal } from '../contexts/PortalContext';

const AuthStateTester = () => {
  const { isFromPortal } = usePortal();
  const [isDev, setIsDev] = useState(false);
  const [overrideAuth, setOverrideAuth] = useState(null);

  useEffect(() => {
    // Only show in development
    const checkDev = import.meta.env.DEV || 
                     import.meta.env.MODE === 'development' ||
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';
    setIsDev(checkDev);
  }, []);

  // Don't render in production
  if (!isDev) {
    return null;
  }

  const handleToggle = (authState) => {
    if (authState) {
      // Simulate authenticated state
      // Set both the dev token (for API calls) and the override (for UI)
      localStorage.setItem('dev-sso-token', 'dev-bypass-token');
      localStorage.setItem('auth-test-override', 'true');
      setOverrideAuth(true);
    } else {
      // Simulate unauthenticated state
      localStorage.removeItem('dev-sso-token');
      localStorage.setItem('auth-test-override', 'false');
      setOverrideAuth(false);
    }
    // Reload to apply changes
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 10000,
      backgroundColor: '#fff',
      border: '2px solid #007bff',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontSize: '12px',
      maxWidth: '250px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#007bff' }}>
        🔧 Dev Auth Tester
      </div>
      <div style={{ marginBottom: '10px', fontSize: '11px', color: '#666' }}>
        Current: <strong style={{ color: isFromPortal ? '#28a745' : '#dc3545' }}>
          {isFromPortal ? '✓ Authenticated' : '✗ Unauthenticated'}
        </strong>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
        <button
          onClick={() => handleToggle(true)}
          style={{
            padding: '8px 12px',
            backgroundColor: isFromPortal ? '#28a745' : '#f8f9fa',
            color: isFromPortal ? 'white' : '#495057',
            border: isFromPortal ? '2px solid #28a745' : '2px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: isFromPortal ? 'bold' : 'normal',
            boxShadow: isFromPortal ? '0 2px 4px rgba(40, 167, 69, 0.3)' : 'none',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!isFromPortal) {
              e.currentTarget.style.backgroundColor = '#e9ecef';
              e.currentTarget.style.borderColor = '#28a745';
            }
          }}
          onMouseLeave={(e) => {
            if (!isFromPortal) {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = '#dee2e6';
            }
          }}
        >
          {isFromPortal && <span style={{ marginRight: '6px' }}>✓</span>}
          Simulate Authenticated
        </button>
        <button
          onClick={() => handleToggle(false)}
          style={{
            padding: '8px 12px',
            backgroundColor: !isFromPortal ? '#dc3545' : '#f8f9fa',
            color: !isFromPortal ? 'white' : '#495057',
            border: !isFromPortal ? '2px solid #dc3545' : '2px solid #dee2e6',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: !isFromPortal ? 'bold' : 'normal',
            boxShadow: !isFromPortal ? '0 2px 4px rgba(220, 53, 69, 0.3)' : 'none',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (isFromPortal) {
              e.currentTarget.style.backgroundColor = '#e9ecef';
              e.currentTarget.style.borderColor = '#dc3545';
            }
          }}
          onMouseLeave={(e) => {
            if (isFromPortal) {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
              e.currentTarget.style.borderColor = '#dee2e6';
            }
          }}
        >
          {!isFromPortal && <span style={{ marginRight: '6px' }}>✓</span>}
          Simulate Unauthenticated
        </button>
      </div>
      <div style={{ marginTop: '8px', fontSize: '10px', color: '#999', fontStyle: 'italic' }}>
        This only appears in development
      </div>
    </div>
  );
};

export default AuthStateTester;

