const express = require('express');
const router = express.Router();
const Record = require('../models/Record');

// Get all records with filtering
router.get('/', async (req, res) => {
  try {
    const { reportType, platform, startDate, endDate } = req.query;
    let query = {};
    
    if (reportType) query.reportType = reportType;
    if (platform) query.platform = platform;
    if (startDate && endDate) {
      query.$or = [
        { startDate: { $gte: startDate }, endDate: { $lte: endDate } },
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ];
    }
    
    const records = await Record.find(query).sort({ uploadedAt: -1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or update record
router.post('/', async (req, res) => {
  try {
    const recordData = req.body;
    
    // Check for duplicates based on platform, dateRange, and reportType
    const existingRecord = await Record.findOne({
      platform: recordData.platform,
      dateRange: recordData.dateRange,
      reportType: recordData.reportType
    });
    
    if (existingRecord) {
      // Update existing record
      const updatedRecord = await Record.findByIdAndUpdate(
        existingRecord._id,
        recordData,
        { new: true, runValidators: true }
      );
      return res.json({
        success: true,
        message: 'Record updated successfully',
        data: updatedRecord
      });
    }
    
    // Create new record
    const newRecord = new Record(recordData);
    const savedRecord = await newRecord.save();
    
    res.status(201).json({
      success: true,
      message: 'Record created successfully',
      data: savedRecord
    });
  } catch (error) {
    console.error('Error saving record:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Delete record
router.delete('/:id', async (req, res) => {
  try {
    const deletedRecord = await Record.findByIdAndDelete(req.params.id);
    if (!deletedRecord) {
      return res.status(404).json({ 
        success: false,
        error: 'Record not found' 
      });
    }
    res.json({ 
      success: true,
      message: 'Record deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting record:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Search records
router.get('/search', async (req, res) => {
  try {
    const { term, reportType } = req.query;
    if (!term) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    let query = {};
    if (reportType) query.reportType = reportType;
    
    const records = await Record.find(query);
    
    // You can implement your existing search logic here
    // This would process the records similar to your current search functionality
    
    res.json(records);
  } catch (error) {
    console.error('Error searching records:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
