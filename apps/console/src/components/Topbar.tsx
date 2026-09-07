import { useState } from "react";

interface TopbarProps {
  onSearch?: (query: string) => void;
  userName?: string;
}

export function Topbar({ onSearch, userName = "Varad Gholap" }: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "VG";

  return (
    <header className="topbar">
      <div className="topbar-search">
        <SearchIcon />
        <input
          type="text"
          className="search-input"
          placeholder="Search repositories, scans, issues..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      <div className="topbar-right">
        <button type="button" className="icon-btn notification-btn" title="Notifications">
          <BellIcon />
          <span className="notification-badge"></span>
        </button>

        <div className="topbar-user-avatar" title={userName}>
          {userInitials}
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
