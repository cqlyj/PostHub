import React, { ChangeEvent } from "react";

interface TopSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

const TopSearchBar: React.FC<TopSearchBarProps> = ({
  searchTerm,
  onSearchChange,
}) => (
  <header className="sticky top-0 z-10 bg-white shadow px-4 py-3 flex items-center">
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Search posts"
        value={searchTerm}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onSearchChange(e.target.value)
        }
        className="w-full bg-gray-100 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
        />
      </svg>
    </div>
  </header>
);

export default TopSearchBar;
