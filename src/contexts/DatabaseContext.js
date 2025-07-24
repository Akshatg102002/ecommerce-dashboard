// contexts/DatabaseContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbManager } from '../utils/database';

const DatabaseContext = createContext();

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseContext must be used within DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider = ({ children }) => {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);

  useEffect(() => {
    const initDb = async () => {
      try {
        await dbManager.initDatabase();
        setIsDbReady(true);
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Database initialization failed:', error);
        setDbError(error);
      }
    };

    initDb();
  }, []);

  const saveRecord = async (reportType, record) => {
    try {
      await dbManager.saveRecord(reportType, record);
      return true;
    } catch (error) {
      console.error('Failed to save record:', error);
      return false;
    }
  };

  const loadRecords = async (reportType) => {
    try {
      return await dbManager.getAllRecords(reportType);
    } catch (error) {
      console.error('Failed to load records:', error);
      return [];
    }
  };

  const deleteRecord = async (reportType, id) => {
    try {
      await dbManager.deleteRecord(reportType, id);
      return true;
    } catch (error) {
      console.error('Failed to delete record:', error);
      return false;
    }
  };

  const clearAllData = async () => {
    try {
      await dbManager.clearAllData();
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  };

  const value = {
    isDbReady,
    dbError,
    saveRecord,
    loadRecords,
    deleteRecord,
    clearAllData,
    dbManager
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};
