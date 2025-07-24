import React from 'react';

function SearchSection({ 
  searchTerm, 
  setSearchTerm, 
  onSearch, 
  onClearSearch, 
  showSearchResults, 
  reportType,
  skuMapping,
  mappingLoaded 
}) {
  const handleSearch = (e) => {
    e.preventDefault();
    onSearch();
  };

  const getSearchPlaceholder = () => {
    switch (reportType) {
      case 'inventory':
        return 'Search products, SKUs, local SKUs, categories, warehouses...';
      case 'orders':
        return 'Search products, categories, cities...';
      case 'returns':
        return 'Search products, return reasons, types...';
      default:
        return 'Search records...';
    }
  };

  return (
    <div className="search-section">
      {/* SKU Mapping Status */}
      {reportType === 'inventory' && (
        <div className="sku-mapping-status">
          {!mappingLoaded ? (
            <span className="loading-status">Loading SKU mapping...</span>
          ) : skuMapping.size > 0 ? (
            <span className="mapping-enabled">
              ✓ SKU Mapping Enabled ({skuMapping.size} mappings loaded)
            </span>
          ) : (
            <span className="mapping-disabled">
              ⚠ SKU Mapping Disabled (Place Myntra_SKU_Map.csv in public folder)
            </span>
          )}
        </div>
      )}
      
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder={getSearchPlaceholder()}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn">Search</button>
        {(searchTerm || showSearchResults) && (
          <button type="button" className="clear-btn" onClick={onClearSearch}>
            Clear
          </button>
        )}
      </form>
    </div>
  );
}

export default SearchSection;