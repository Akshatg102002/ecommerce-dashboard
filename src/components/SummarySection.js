import React, { useState, useMemo } from 'react'
import DateRangeFilter from './DateRangeFilter'

function SummarySection({ records, reportType }) {
  const [filterRange, setFilterRange] = useState({ startDate: '', endDate: '', isActive: false })
  const [groupBy, setGroupBy] = useState('platform')
  const [skuSearchTerm, setSkuSearchTerm] = useState('')

  // formatting helpers
  const formatCurrency = amount =>
    `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  const formatNumber = num => Number(num).toLocaleString('en-IN')

  // receive date‐range selection
  const handleFilterChange = range => setFilterRange(range)

  // normalize record date for filtering
  const getRecordDate = record => {
    if (record.startDate) return record.startDate
    if (record.endDate) return record.endDate
    if (record.uploadedAt) return record.uploadedAt.split('T')[0]
    if (record.date) return new Date(record.date).toISOString().split('T')[0]
    return null
  }

  // apply date filter
  const filteredRecords = useMemo(() => {
    if (!filterRange.isActive) return records
    return records.filter(record => {
      const d = getRecordDate(record)
      return d && d >= filterRange.startDate && d <= filterRange.endDate
    })
  }, [records, filterRange])

  // aggregate by platform
  const platformSummary = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      const key = r.platform || 'Unknown'
      if (!acc[key]) acc[key] = { orders: 0, sales: 0, returns: 0, refund: 0, stock: 0, recordCount: 0 }
      acc[key].recordCount += 1
      if (reportType === 'orders') {
        acc[key].orders += r.totalOrders || 0
        acc[key].sales += r.totalSales || 0
      } else if (reportType === 'returns') {
        acc[key].returns += r.totalReturns || 0
        acc[key].refund += r.totalRefundAmount || 0
      } else if (reportType === 'inventory') {
        acc[key].stock += r.totalStock || 0
      }
      return acc
    }, {})
  }, [filteredRecords, reportType])

  // aggregate by SKU with search functionality
  const skuSummary = useMemo(() => {
    const acc = {}
    filteredRecords.forEach(r => {
      if (!r.skus) return
      Object.entries(r.skus).forEach(([sku, val]) => {
        acc[sku] = (acc[sku] || 0) + val
      })
    })
    
    // Filter SKUs based on search term
    const filteredSkus = Object.entries(acc).filter(([sku]) => 
      sku.toLowerCase().includes(skuSearchTerm.toLowerCase())
    )
    
    // Sort by value (descending) and take top 20
    const sortedSkus = filteredSkus
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
    
    return Object.fromEntries(sortedSkus)
  }, [filteredRecords, skuSearchTerm])

  // Get platform icon based on platform name
  const getPlatformIcon = (platform) => {
    const icons = {
      myntra: 'fas fa-shopping-bag',
      amazon: 'fab fa-amazon',
      flipkart: 'fas fa-store',
      nykaa: 'fas fa-heart',
      ajio: 'fas fa-tshirt',
      delhi_warehouse: 'fas fa-warehouse'
    }
    return icons[platform.toLowerCase()] || 'fas fa-shopping-cart'
  }

  return (
    <>
      <style jsx>{`
        .ss_analytics_dashboard_main {
          margin: 2rem 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .ss_dashboard_header_container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e9ecef;
        }
        
        .ss_dashboard_title_heading {
          color: #1a1a1a;
          font-size: 1.8rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .ss_overview_metrics_grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
          padding: 1.25rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
        }
        
        .ss_metric_card_item {
          text-align: center;
          padding: 0.75rem 0.5rem;
          background: white;
          border-radius: 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease;
        }
        
        .ss_metric_card_item:hover {
          transform: translateY(-1px);
        }
        
        .ss_metric_value_display {
          font-size: 1.6rem;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 0.25rem;
          line-height: 1.2;
        }
        
        .ss_metric_label_text {
          font-size: 0.8rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          font-weight: 600;
        }
        
        .ss_filter_controls_wrapper {
          display: flex;
          gap: 2rem;
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
          border: 1px solid #e9ecef;
        }
        
        .ss_radio_group_container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          color: #495057;
          transition: color 0.2s ease;
        }
        
        .ss_radio_group_container:hover {
          color: #007bff;
        }
        
        .ss_radio_group_container input[type="radio"] {
          width: 16px;
          height: 16px;
          accent-color: #007bff;
        }
        
        .ss_platform_grid_layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 1.5rem;
          margin: 2rem 0;
        }
        
        .ss_platform_card_container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid #e9ecef;
        }
        
        .ss_platform_card_container:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        }
        
        .ss_platform_header_section {
          padding: 1.25rem 1.5rem;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: white;
          position: relative;
          overflow: hidden;
        }
        
        .ss_platform_header_section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, rgba(255,255,255,0.08) 0%, transparent 100%);
        }
        
        .ss_platform_name_title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;
          z-index: 1;
        }
        
        .ss_platform_icon_display {
          font-size: 1.3rem;
          opacity: 0.9;
        }
        
        .ss_record_counter_badge {
          font-size: 0.8rem;
          opacity: 0.85;
          margin-top: 0.5rem;
          position: relative;
          z-index: 1;
        }
        
        .ss_platform_content_area {
          padding: 1.25rem 1.5rem;
        }
        
        .ss_stats_grid_layout {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1rem;
        }
        
        .ss_stat_box_item {
          text-align: center;
          padding: 0.75rem 0.5rem;
          background: #f8f9fa;
          border-radius: 6px;
          transition: background-color 0.2s ease;
        }
        
        .ss_stat_box_item:hover {
          background: #e9ecef;
        }
        
        .ss_stat_number_value {
          font-size: 1.3rem;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: 0.25rem;
          line-height: 1.2;
        }
        
        .ss_stat_title_label {
          font-size: 0.75rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        
        .ss_sku_search_wrapper {
          margin: 1.5rem 0;
          position: relative;
        }
        
        .ss_search_input_container {
          position: relative;
          max-width: 450px;
        }
        
        .ss_search_input_field {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 3rem;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 1rem;
          background: white;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        
        .ss_search_input_field:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.08);
          transform: translateY(-1px);
        }
        
        .ss_search_icon_element {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          font-size: 1rem;
        }
        
        .ss_sku_section_header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1.5rem 0 1rem 0;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e9ecef;
        }
        
        .ss_sku_title_heading {
          color: #1a1a1a;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .ss_sku_counter_info {
          font-size: 0.8rem;
          color: #6c757d;
          font-weight: 500;
        }
        
        .ss_sku_grid_layout {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin: 1.5rem 0;
        }
        
        .ss_sku_item_card {
          background: white;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }
        
        .ss_sku_item_card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.12);
          transform: translateY(-1px);
        }
        
        .ss_sku_code_text {
          font-weight: 700;
          font-size: 0.85rem;
          color: #1a1a1a;
          margin-bottom: 0.75rem;
          word-break: break-all;
          line-height: 1.3;
        }
        
        .ss_sku_amount_value {
          font-size: 1.1rem;
          font-weight: 800;
          color: #007bff;
          line-height: 1.2;
        }
        
        .ss_empty_state_container {
          text-align: center;
          padding: 2.5rem 1.5rem;
          background: #f8f9fa;
          border-radius: 8px;
          margin: 1.5rem 0;
        }
        
        .ss_empty_state_icon {
          font-size: 2.5rem;
          color: #6c757d;
          margin-bottom: 0.75rem;
        }
        
        .ss_empty_state_text {
          color: #6c757d;
          font-size: 1rem;
          font-weight: 500;
        }
        
        @media (max-width: 768px) {
          .ss_platform_grid_layout {
            grid-template-columns: 1fr;
          }
          
          .ss_sku_grid_layout {
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          }
          
          .ss_overview_metrics_grid {
            grid-template-columns: 1fr;
            padding: 1rem;
          }
          
          .ss_filter_controls_wrapper {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem;
          }
          
          .ss_dashboard_title_heading {
            font-size: 1.5rem;
          }
          
          .ss_sku_section_header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }
        
        @media (max-width: 480px) {
          .ss_analytics_dashboard_main {
            margin: 1rem 0;
          }
          
          .ss_platform_header_section {
            padding: 1rem 1.25rem;
          }
          
          .ss_platform_content_area {
            padding: 1rem 1.25rem;
          }
          
          .ss_stats_grid_layout {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
        }
      `}</style>

      <div className="ss_analytics_dashboard_main">
        <div className="ss_dashboard_header_container">
          <h2 className="ss_dashboard_title_heading">
            <i className="fas fa-chart-bar"></i>
            Analytics Dashboard ({reportType.charAt(0).toUpperCase() + reportType.slice(1)})
          </h2>
        </div>

        {/* Overall Summary Stats */}
        <div className="ss_overview_metrics_grid">
          <div className="ss_metric_card_item">
            <div className="ss_metric_value_display">{filteredRecords.length}</div>
            <div className="ss_metric_label_text">Total Records</div>
          </div>
          {reportType === 'orders' && (
            <>
              <div className="ss_metric_card_item">
                <div className="ss_metric_value_display">
                  {formatNumber(Object.values(platformSummary).reduce((sum, data) => sum + data.orders, 0))}
                </div>
                <div className="ss_metric_label_text">Total Orders</div>
              </div>
              <div className="ss_metric_card_item">
                <div className="ss_metric_value_display">
                  {formatCurrency(Object.values(platformSummary).reduce((sum, data) => sum + data.sales, 0))}
                </div>
                <div className="ss_metric_label_text">Total Sales</div>
              </div>
            </>
          )}
          {reportType === 'returns' && (
            <>
              <div className="ss_metric_card_item">
                <div className="ss_metric_value_display">
                  {formatNumber(Object.values(platformSummary).reduce((sum, data) => sum + data.returns, 0))}
                </div>
                <div className="ss_metric_label_text">Total Returns</div>
              </div>
              <div className="ss_metric_card_item">
                <div className="ss_metric_value_display">
                  {formatCurrency(Object.values(platformSummary).reduce((sum, data) => sum + data.refund, 0))}
                </div>
                <div className="ss_metric_label_text">Total Refund</div>
              </div>
            </>
          )}
          {reportType === 'inventory' && (
            <div className="ss_metric_card_item">
              <div className="ss_metric_value_display">
                {formatNumber(Object.values(platformSummary).reduce((sum, data) => sum + data.stock, 0))}
              </div>
              <div className="ss_metric_label_text">Total Stock</div>
            </div>
          )}
        </div>

        <DateRangeFilter
          currentRecords={records}
          reportType={reportType}
          onFilterChange={handleFilterChange}
        />

        <div className="ss_filter_controls_wrapper">
          <label className="ss_radio_group_container">
            <input
              type="radio"
              name="groupBy"
              value="platform"
              checked={groupBy === 'platform'}
              onChange={() => setGroupBy('platform')}
            />
            <i className="fas fa-th-large"></i>
            Group by Platform
          </label>
          <label className="ss_radio_group_container">
            <input
              type="radio"
              name="groupBy"
              value="sku"
              checked={groupBy === 'sku'}
              onChange={() => setGroupBy('sku')}
            />
            <i className="fas fa-barcode"></i>
            Group by SKU (Top 20)
          </label>
        </div>

        {groupBy === 'platform' ? (
          <div className="ss_platform_grid_layout">
            {Object.entries(platformSummary).map(([platform, data]) => (
              <div key={platform} className="ss_platform_card_container">
                <div className="ss_platform_header_section">
                  <h4 className="ss_platform_name_title">
                    <i className={`${getPlatformIcon(platform)} ss_platform_icon_display`}></i>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </h4>
                  <div className="ss_record_counter_badge">
                    {data.recordCount} record{data.recordCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="ss_platform_content_area">
                  <div className="ss_stats_grid_layout">
                    {reportType === 'orders' && (
                      <>
                        <div className="ss_stat_box_item">
                          <div className="ss_stat_number_value">{formatNumber(data.orders)}</div>
                          <div className="ss_stat_title_label">Orders</div>
                        </div>
                        <div className="ss_stat_box_item">
                          <div className="ss_stat_number_value">{formatCurrency(data.sales)}</div>
                          <div className="ss_stat_title_label">Sales</div>
                        </div>
                        <div className="ss_stat_box_item">
                          <div className="ss_stat_number_value">
                            {data.orders > 0 ? formatCurrency(data.sales / data.orders) : '₹0'}
                          </div>
                          <div className="ss_stat_title_label">Avg Order</div>
                        </div>
                      </>
                    )}
                    {reportType === 'returns' && (
                      <>
                        <div className="ss_stat_box_item">
                          <div className="ss_stat_number_value">{formatNumber(data.returns)}</div>
                          <div className="ss_stat_title_label">Returns</div>
                        </div>
                        <div className="ss_stat_box_item">
                          <div className="ss_stat_number_value">{formatCurrency(data.refund)}</div>
                          <div className="ss_stat_title_label">Refund</div>
                        </div>
                        <div className="ss_stat_box_item">
                          <div className="ss_stat_number_value">
                            {data.returns > 0 ? formatCurrency(data.refund / data.returns) : '₹0'}
                          </div>
                          <div className="ss_stat_title_label">Avg Refund</div>
                        </div>
                      </>
                    )}
                    {reportType === 'inventory' && (
                      <div className="ss_stat_box_item">
                        <div className="ss_stat_number_value">{formatNumber(data.stock)}</div>
                        <div className="ss_stat_title_label">Total Stock</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="ss_sku_search_wrapper">
              <div className="ss_search_input_container">
                <i className="fas fa-search ss_search_icon_element"></i>
                <input
                  type="text"
                  className="ss_search_input_field"
                  placeholder="Search SKUs..."
                  value={skuSearchTerm}
                  onChange={(e) => setSkuSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="ss_sku_section_header">
              <h5 className="ss_sku_title_heading">
                <i className="fas fa-barcode"></i>
                Top SKUs 
                {skuSearchTerm && (
                  <span className="text-muted ms-2">
                    (filtered by "{skuSearchTerm}")
                  </span>
                )}
              </h5>
              <small className="ss_sku_counter_info">
                Showing {Object.keys(skuSummary).length} of {
                  Object.keys(filteredRecords.reduce((acc, r) => ({ ...acc, ...r.skus }), {})).length
                } total SKUs
              </small>
            </div>

            <div className="ss_sku_grid_layout">
              {Object.entries(skuSummary).map(([sku, value]) => (
                <div key={sku} className="ss_sku_item_card">
                  <div className="ss_sku_code_text">{sku}</div>
                  <div className="ss_sku_amount_value">
                    {reportType === 'orders' && formatCurrency(value)}
                    {reportType === 'returns' && formatNumber(value)}
                    {reportType === 'inventory' && formatNumber(value)}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(skuSummary).length === 0 && (
              <div className="ss_empty_state_container">
                <div className="ss_empty_state_icon">
                  <i className="fas fa-search"></i>
                </div>
                <div className="ss_empty_state_text">
                  No SKUs found matching your search criteria.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

export default SummarySection