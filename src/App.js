import React, { useState, useEffect } from 'react';
import PlatformTabs from './components/PlatformTabs';
import UploadSection from './components/UploadSection';
import RecordsSection from './components/RecordsSection';
import SummarySection from './components/SummarySection';
import ChartsSection from './components/ChartsSection';
import ExportSection from './components/ExportSection';
import DateRangeFilter from './components/DateRangeFilter';
import AIInsightsSection from './components/AIInsightsSection';
import { DatabaseProvider, useDatabaseContext } from './contexts/DatabaseContext';
import './App.css';

const PREDEFINED_CREDENTIALS = {
  username: 'BaniAdmin',
  password: 'Bani@Ecom999'
};

function LoginScreen({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    if (
      credentials.username === PREDEFINED_CREDENTIALS.username &&
      credentials.password === PREDEFINED_CREDENTIALS.password
    ) {
      const loginData = {
        username: credentials.username,
        loginTime: new Date().toISOString(),
        sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      };
      
      onLogin(loginData);
    } else {
      setError('Invalid username or password');
    }
    
    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError(''); // Clear error when user starts typing
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div className="login-card" style={{
        backgroundColor: 'white',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        padding: '3rem',
        width: '100%',
        maxWidth: '450px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, #667eea20, #764ba220)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #764ba220, #667eea20)',
          borderRadius: '50%',
          zIndex: 0
        }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="text-center mb-5">
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              🏪
            </div>
            <h2 style={{ 
              color: '#1f2937', 
              marginBottom: '0.5rem',
              fontSize: '1.75rem',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>
              Bani Women Dashboard
            </h2>
            <p style={{ 
              color: '#6b7280', 
              fontSize: '0.95rem',
              fontWeight: '400',
              margin: 0
            }}>
              Please sign in to access your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="username" className="form-label" style={{ 
                color: '#374151', 
                fontWeight: '600',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
                display: 'block'
              }}>
                Username
              </label>
              <input
                type="text"
                className="form-control"
                id="username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                style={{
                  borderRadius: '0.75rem',
                  border: '2px solid #e5e7eb',
                  padding: '0.875rem 1rem',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#f9fafb',
                  width: '100%'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter your username"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label" style={{ 
                color: '#374151', 
                fontWeight: '600',
                fontSize: '0.875rem',
                marginBottom: '0.5rem',
                display: 'block'
              }}>
                Password
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                name="password"
                value={credentials.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                style={{
                  borderRadius: '0.75rem',
                  border: '2px solid #e5e7eb',
                  padding: '0.875rem 1rem',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#f9fafb',
                  width: '100%'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.backgroundColor = '#ffffff';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center'
              }}>
                <span style={{ marginRight: '0.5rem' }}>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn w-100"
              disabled={isLoading || !credentials.username || !credentials.password}
              style={{
                borderRadius: '0.75rem',
                padding: '0.875rem 1rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: isLoading 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white',
                transition: 'all 0.2s ease',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transform: 'translateY(0)',
                boxShadow: '0 4px 14px rgba(102, 126, 234, 0.3)',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && credentials.username && credentials.password) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 14px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                <>
                  <span style={{ marginRight: '0.5rem' }}>🔐</span>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center">
            <div style={{
              backgroundColor: '#f3f4f6',
              padding: '1rem',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportTypeTabs({ currentReportType, setCurrentReportType }) {
  const reportTypes = [
    { key: 'orders', label: 'Orders', icon: '📊' },
    { key: 'returns', label: 'Returns', icon: '↩️' },
    { key: 'inventory', label: 'Inventory', icon: '📦' }
  ];

  return (
    <div className="report-type-tabs mb-2">
  <div className="container-fluid">
    <div className="row justify-content-center">
      <div className="col-12 col-md-8">
        <div className="card shadow-sm border-0" style={{ borderRadius: '1rem' }}>
          <div className="card-body p-3">
            <div className="d-flex justify-content-center">
              <div className="btn-group" role="group" aria-label="Report type selection">
                {reportTypes.map((type) => (
                  <button
                    key={type.key}
                    type="button"
                    className={`btn ${currentReportType === type.key ? 'btn-primary' : 'btn-outline-primary'} px-4 py-2`}
                    onClick={() => setCurrentReportType(type.key)}
                    style={{ borderRadius: '0.5rem', marginRight: '2px' }}
                  >
                    <span className="me-2">{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <style jsx>{`
    /* Mobile responsive styles */
    @media (max-width: 768px) {
      .col-md-8 {
        padding-left: 1rem;
        padding-right: 1rem;
      }
      
      .card-body {
        padding: 0.75rem !important;
      }
      
      .btn-group .btn {
        flex: 1;
        padding: 0.5rem 0.75rem !important;
        font-size: 14px;
        min-width: 0;
      }
      
      .btn-group .btn span.me-2 {
        margin-right: 0.25rem !important;
      }
    }

    @media (max-width: 576px) {
      .container-fluid {
        padding-left: 0.5rem;
        padding-right: 0.5rem;
      }
      
      .card-body {
        padding: 0.5rem !important;
      }
      
      .btn-group .btn {
        padding: 0.4rem 0.5rem !important;
        font-size: 13px;
        margin-right: 1px !important;
      }
      
      .btn-group .btn span {
        font-size: 12px;
      }
    }

    @media (max-width: 480px) {
      .btn-group .btn {
        padding: 0.35rem 0.4rem !important;
        font-size: 12px;
      }
      
      .btn-group .btn span.me-2 {
        margin-right: 0.15rem !important;
        font-size: 14px;
      }
      
      .btn-group .btn span:not(.me-2) {
        font-size: 11px;
      }
    }

    /* Ensure buttons stay in a row and distribute evenly */
    .btn-group {
      width: 100%;
      max-width: 500px;
    }
    
    .btn-group .btn {
      flex: 1;
      white-space: nowrap;
    }
  `}</style>
</div>
  );
}

function AppContent() {
  const { isDbReady, loadRecords, saveRecord, deleteRecord } = useDatabaseContext();

  const [allRecords, setAllRecords] = useState({
    orders: [],
    returns: [],
    inventory: []
  });
  const [reportType, setReportType] = useState('orders');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '', isActive: false });
  const [currentUser, setCurrentUser] = useState(null);

  const currentRecords = allRecords[reportType] || [];

  // Filter records based on date filter
  const filteredRecords = dateFilter.isActive 
    ? currentRecords.filter(record => {
        const recordDate = record.startDate || 
                          record.endDate || 
                          record.uploadedAt?.split('T')[0] || 
                          (record.date ? new Date(record.date).toISOString().split('T')[0] : null);

        if (!recordDate || recordDate === 'Invalid Date') return false;
        return recordDate >= dateFilter.startDate && recordDate <= dateFilter.endDate;
      })
    : currentRecords;

  useEffect(() => {
    const loadSavedData = async () => {
      if (isDbReady) {
        try {
          const savedRecords = await loadRecords(reportType);
          console.log(`Loading ${reportType} records:`, savedRecords?.length || 0);

          setAllRecords(prev => ({
            ...prev,
            [reportType]: savedRecords || []
          }));
        } catch (error) {
          console.log(`No saved ${reportType} records found, starting fresh`);
          setAllRecords(prev => ({
            ...prev,
            [reportType]: []
          }));
        }
      }
    };
    loadSavedData();
  }, [reportType, isDbReady, loadRecords]);

  const handleUpload = async (uploadedData) => {
    try {
      // Enhanced duplicate check for Myntra
      let existingRecordIndex = -1;

      if (uploadedData.platform?.toLowerCase() === 'myntra') {
        // For Myntra, check platform + date + specific report type
        existingRecordIndex = currentRecords.findIndex(record =>
          record.platform === uploadedData.platform &&
          record.dateRange === uploadedData.dateRange &&
          record.reportType === uploadedData.reportType // This will be 'sjit', 'ppmp', or 'rtv'
        );
      } else {
        // For other platforms, check platform + date only
        existingRecordIndex = currentRecords.findIndex(record =>
          record.platform === uploadedData.platform &&
          record.dateRange === uploadedData.dateRange
        );
      }

      // If replacing existing record, remove the old one first
      if (existingRecordIndex !== -1) {
        const existingRecord = currentRecords[existingRecordIndex];
        await handleDelete(existingRecord.id);
      }

      // Ensure the data has the correct report type
      const dataWithReportType = {
        ...uploadedData,
        uploadTimestamp: new Date().toISOString(),
        uploadedBy: currentUser?.username
      };

      // Save to database under correct report type
      if (isDbReady) {
        await saveRecord(reportType, dataWithReportType);
        console.log(`Saved ${reportType} record to database`);
      }

      // Update local state for current report type only
      setAllRecords(prev => ({
        ...prev,
        [reportType]: [...prev[reportType], dataWithReportType]
      }));

      alert(`✅ Data uploaded successfully!\nRecords: ${uploadedData.rawData?.length || 0}`);

    } catch (error) {
      console.error('Error saving record:', error);
      alert('❌ Failed to upload data. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    try {
      if (isDbReady) {
        await deleteRecord(reportType, id);
        console.log(`Deleted ${reportType} record from database`);
      }

      setAllRecords(prev => ({
        ...prev,
        [reportType]: prev[reportType].filter(record => record.id !== id)
      }));

    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const handleReportTypeChange = (newReportType) => {
    console.log(`Switching from ${reportType} to ${newReportType}`);
    setReportType(newReportType);
    // Reset date filter when changing report types
    setDateFilter({ startDate: '', endDate: '', isActive: false });
  };

  const handleFilterChange = (filterData) => {
    setDateFilter(filterData);
    console.log('Filter applied:', filterData);
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm('Are you sure you want to logout?');
    
    if (!confirmLogout) {
      return;
    }

    try {
      // Clear session from database if needed
      if (isDbReady && currentUser) {
        console.log('Logout - session cleared');
      }
      
      // Clear localStorage
      localStorage.removeItem('dashboardAuth');
      
      setCurrentUser(null);
      
      // Clear all records on logout for security
      setAllRecords({
        orders: [],
        returns: [],
        inventory: []
      });
      
      // This will trigger a re-render and show login screen
      window.location.reload();
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Still perform logout even if cleanup fails
      localStorage.removeItem('dashboardAuth');
      window.location.reload();
    }
  };

  return (
    <div className="App">
      {/* Header without sticky positioning */}
      <header          
        className="dashboard-header"          
        style={{            
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',           
          color: 'white',           
          padding: '1rem 2rem',           
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'         
        }}       
      >         
        <div className="container-fluid">           
          <div className="row align-items-center">             
            <div className="col-12 col-lg-8">               
              <h1 style={{                  
                margin: 0,                  
                fontSize: 'clamp(1.25rem, 4vw, 1.75rem)',                 
                fontWeight: '700',                 
                letterSpacing: '-0.025em',                 
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'               
              }}>                 
                🏪 Bani Women Multi-Platform Ecommerce Dashboard               
              </h1>             
            </div>             
            <div className="col-12 col-lg-4 mt-2 mt-lg-0">               
              <div className="d-flex align-items-center justify-content-lg-end">                 
                <div className="user-info me-3" style={{                   
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',                   
                  padding: '0.5rem 1rem',                   
                  borderRadius: '2rem',                   
                  backdropFilter: 'blur(10px)',                   
                  border: '1px solid rgba(255, 255, 255, 0.2)'                 
                }}>                   
                  <span style={{                      
                    fontSize: '0.875rem',                     
                    fontWeight: '500',                     
                    opacity: 0.9                   
                  }}>                     
                    👋 Welcome, <strong style={{ fontWeight: '700' }}>{currentUser?.username || 'User'}</strong>                   
                  </span>                 
                </div>                 
                <button                    
                  className="btn btn-light btn-sm"                   
                  onClick={handleLogout}                   
                  style={{                      
                    borderRadius: '2rem',                     
                    padding: '0.5rem 1rem',  
                    marginTop: '1rem',                   
                    fontWeight: '600',                     
                    fontSize: '0.875rem',                     
                    border: '2px solid rgba(255, 255, 255, 0.3)',                     
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',                     
                    color: '#4b5563',                     
                    transition: 'all 0.2s ease',                     
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'                   
                  }}                   
                  onMouseEnter={(e) => {                     
                    e.target.style.backgroundColor = '#ffffff';                     
                    e.target.style.transform = 'translateY(-1px)';                     
                    e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';                   
                  }}                   
                  onMouseLeave={(e) => {                     
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';                     
                    e.target.style.transform = 'translateY(0)';                     
                    e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';                   
                  }}                 
                >                   
                  🚪 Logout                 
                </button>               
              </div>             
            </div>           
          </div>         
        </div>       
      </header>

      {/* Report Type Tabs - normal flow */}
      <div style={{ paddingTop: '0rem' }}>
        <ReportTypeTabs
          currentReportType={reportType}
          setCurrentReportType={handleReportTypeChange}
        />
      </div>

      {/* Platform Tabs - normal flow */}
      <PlatformTabs reportType={reportType} setReportType={setReportType} />

      {/* Status Bar - normal flow */}
      <div className="container-fluid mb-3">
        <div style={{
          backgroundColor: '#f8fafc',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div className="row align-items-center">
            <div className="col-12 col-md-6">
              <small style={{ 
                color: '#64748b',
                fontSize: '0.8rem',
                fontWeight: '500'
              }}>
                📊 Current Report: <strong style={{ color: '#1e293b' }}>{reportType}</strong> | 
                Records: <strong style={{ color: '#059669' }}>{currentRecords.length}</strong>
                {dateFilter.isActive && ` | Filtered: ${filteredRecords.length}`}
              </small>
            </div>
            <div className="col-12 col-md-6 mt-2 mt-md-0">
              <div className="d-flex justify-content-md-end">
                <small style={{ 
                  color: '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}>
                  📋 Orders: <span style={{ color: '#dc2626', fontWeight: '600' }}>{allRecords.orders.length}</span> | 
                  ↩️ Returns: <span style={{ color: '#ea580c', fontWeight: '600' }}>{allRecords.returns.length}</span> | 
                  📦 Inventory: <span style={{ color: '#7c3aed', fontWeight: '600' }}>{allRecords.inventory.length}</span>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections - all in normal document flow */}
      <UploadSection
        onUpload={handleUpload}
        reportType={reportType}
        currentRecords={currentRecords}
      />

      <RecordsSection
        records={filteredRecords}
        onDelete={handleDelete}
        reportType={reportType}
      />

      <ChartsSection records={filteredRecords} reportType={reportType} />

      {/* AI Insights Section - only show if we have records */}
      {filteredRecords.length > 0 && (
        <AIInsightsSection records={filteredRecords} reportType={reportType} />
      )}

      <SummarySection records={filteredRecords} reportType={reportType} />

      {/* <ExportSection records={filteredRecords} reportType={reportType} /> */}
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('dashboardAuth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        const loginTime = new Date(authData.loginTime);
        const now = new Date();
        const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

        // Auto-logout after 24 hours
        if (hoursSinceLogin < 24) {
          setIsAuthenticated(true);
          setUser(authData);
        } else {
          localStorage.removeItem('dashboardAuth');
        }
      } catch (error) {
        console.error('Error parsing auth data:', error);
        localStorage.removeItem('dashboardAuth');
      }
    }
  }, []);

  const handleLogin = (loginData) => {
    setIsAuthenticated(true);
    setUser(loginData);
    localStorage.setItem('dashboardAuth', JSON.stringify(loginData));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('dashboardAuth');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <DatabaseProvider>
      <div className="authenticated-app">
        <AppContent />
      </div>
    </DatabaseProvider>
  );
}

export default App;