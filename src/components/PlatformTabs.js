import React from 'react';


function PlatformTabs({ setCurrentPlatform }) {
  const platforms = ['all', 'myntra', 'amazon', 'ajio', 'nykaa', 'myntra ads'];

  return (
    <div className="platform-tabs">
  {platforms.map(platform => (
    <button
      key={platform}
      className={`platform-tab ${platform}`}
      onClick={() => setCurrentPlatform(platform)}
    >
      {platform.toUpperCase()}
    </button>
  ))}
</div>
  );
}

export default PlatformTabs;
