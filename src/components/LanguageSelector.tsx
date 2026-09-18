import React, { useState, useRef, useEffect } from "react";
import { Globe, Search, X, Check, ChevronDown } from "lucide-react";
import { LANGUAGES_LIST } from "../lib/languages";
import { playClickSound } from "../lib/audio";

interface Props {
  selectedLanguage: string;
  onLanguageChange: (langName: string) => void;
  className?: string;
}

export const LanguageSelector: React.FC<Props> = ({
  selectedLanguage,
  onLanguageChange,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Find currently selected language metadata
  const currentLang =
    LANGUAGES_LIST.find(
      (l) =>
        l.name.toLowerCase() === selectedLanguage.toLowerCase() ||
        l.code.toLowerCase() === selectedLanguage.toLowerCase()
    ) ||
    LANGUAGES_LIST.find((l) => l.name === "English") ||
    LANGUAGES_LIST[0];

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter languages: case-insensitive, partial-name matching
  const filteredLanguages = LANGUAGES_LIST.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q)
    );
  });

  const handleSelect = (langName: string) => {
    playClickSound();
    onLanguageChange(langName);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        id="language-selector-trigger"
        type="button"
        onClick={() => {
          playClickSound();
          setIsOpen((prev) => !prev);
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-800 font-bold text-xs sm:text-sm cursor-pointer transition-colors shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px] sm:max-w-[200px]"
        title="Select Website Language"
      >
        <Globe className="w-4 h-4 text-blue-600 shrink-0" />
        <span className="truncate">{currentLang.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          id="language-selector-dropdown"
          className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header & Search Bar */}
          <div className="p-2.5 sm:p-3 border-b border-slate-100 bg-slate-50/80">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                id="language-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search language..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1 text-[11px] text-slate-400 font-semibold">
              <span>{filteredLanguages.length} of {LANGUAGES_LIST.length} languages</span>
              <span>Alphabetical</span>
            </div>
          </div>

          {/* Languages List */}
          <div
            id="language-options-list"
            role="listbox"
            className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-100 p-1.5 focus:outline-none"
          >
            {filteredLanguages.length === 0 ? (
              <div
                id="no-language-found-message"
                className="py-8 px-4 text-center text-xs sm:text-sm font-semibold text-slate-500 flex flex-col items-center gap-1.5"
              >
                <span>No language found</span>
                <span className="text-[11px] font-normal text-slate-400">
                  Try searching by common or native name
                </span>
              </div>
            ) : (
              filteredLanguages.map((l) => {
                const isSelected =
                  l.name.toLowerCase() === currentLang.name.toLowerCase();
                return (
                  <button
                    key={l.code}
                    id={`lang-option-${l.code}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(l.name)}
                    className={`w-full min-h-[44px] px-3 py-2.5 rounded-xl flex items-center justify-between text-left text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-baseline gap-2 truncate pr-2">
                      <span className="truncate">{l.name}</span>
                      {l.nativeName && l.nativeName !== l.name && (
                        <span className="text-xs font-normal text-slate-400 shrink-0">
                          ({l.nativeName})
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
