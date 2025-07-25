import React from 'react';

function PlatformTabs({ setCurrentPlatform }) {
  const platforms = [
    { name: 'Platforms Available', isClickable: true, hasArrow: true },
    { name: 'myntra', isClickable: true },
    { name: 'amazon', isClickable: true },
    { name: 'ajio', isClickable: true },
    { name: 'nykaa', isClickable: true }
  ];

  const handleClick = (platform) => {
    if (platform.isClickable) {
      setCurrentPlatform(platform.name);
    }
  };

  return (
    <div className="platform-tabs">
      {platforms.map((platform, index) => (
        <button
          key={platform.name}
          className={`platform-tab ${platform.name.toLowerCase().replace(/\s+/g, '-')} ${
            !platform.isClickable ? 'unclickable' : ''
          }`}
          onClick={() => handleClick(platform)}
        >
          {platform.name.toUpperCase()}
          {platform.hasArrow && <span className="arrow"> →</span>}
        </button>
      ))}
      
      <style jsx>{`
        .platform-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 4px;
          justify-content: center;
        }

        .platform-tab {
          padding: 12px 20px;
          border: 2px solid #ddd;
          background-color: #f8f9fa;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
          cursor: pointer;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .platform-tab.unclickable {
          cursor: not-allowed;
          opacity: 0.7;
          background-color: #e9ecef;
          color: #6c757d;
        }

        .platform-tab:not(.unclickable):hover {
          background-color: #e9ecef;
          border-color: #adb5bd;
          transform: translateY(-2px);
        }



        .arrow {
          font-size: 16px;
          font-weight: bold;
        }

        /* Mobile responsive design */
        @media (max-width: 768px) {
          .platform-tabs {
            padding: 12px;
            gap: 6px;
          }

          .platform-tab {
            padding: 10px 16px;
            font-size: 12px;
            flex: 1;
            min-width: 0;
            justify-content: center;
          }

          .platform-tab:first-child {
            flex: 100%;
            margin-bottom: 8px;
          }
        }

        @media (max-width: 480px) {
          .platform-tabs {
            padding: 8px;
            gap: 4px;
          }

          .platform-tab {
            padding: 8px 12px;
            font-size: 11px;
            border-radius: 6px;
          }

          .platform-tab:not(:first-child) {
            flex: 1;
            min-width: 0;
          }

          .arrow {
            font-size: 14px;
          }
        }

        /* Very small screens */
        @media (max-width: 360px) {
          .platform-tab {
            padding: 6px 8px;
            font-size: 10px;
          }

          .platform-tab:first-child {
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}

export default PlatformTabs;