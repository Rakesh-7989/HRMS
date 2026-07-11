import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { countries, Country } from '@/data/countries';
import { cn } from '@/utils/cn';

interface PhoneInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (e: any) => void;
  error?: boolean;
  placeholder?: string;
  className?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  name,
  value,
  onChange,
  onBlur,
  error,
  placeholder = "Phone number",
  className
}) => {
  // Extract dial code and number from value
  // This assumes value is stored as dialCode + " " + number OR just number
  const initialCountry = useMemo(() => {
    if (!value) return countries.find(c => c.code === 'IN') || countries[0];
    const match = countries.sort((a, b) => b.dial_code.length - a.dial_code.length)
      .find(c => value.startsWith(c.dial_code));
    return match || countries.find(c => c.code === 'IN') || countries[0];
  }, []);

  const [selectedCountry, setSelectedCountry] = useState<Country>(initialCountry);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Phone number without dial code
  const phoneNumber = useMemo(() => {
    if (value.startsWith(selectedCountry.dial_code)) {
      return value.slice(selectedCountry.dial_code.length).trim();
    }
    return value;
  }, [value, selectedCountry.dial_code]);

  const filteredCountries = useMemo(() => {
    return countries.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.dial_code.includes(search)
    );
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch("");
    // Update value with new dial code
    onChange(`${country.dial_code} ${phoneNumber.slice(0, country.length)}`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    const limitedVal = rawVal.slice(0, selectedCountry.length);
    onChange(`${selectedCountry.dial_code} ${limitedVal}`);
  };

  return (
    <div 
      className={cn(
        "group relative flex items-center w-full rounded-xl border transition-all duration-200 bg-gray-50 dark:bg-gray-800/50",
        error 
          ? "border-red-500 ring-red-500/10" 
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-primary/10",
        className
      )}
    >
      {/* Country Selector */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 h-10 pl-4 pr-3 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-l-xl border-r border-gray-200 dark:border-gray-700"
        >
          <span className="tabular-nums">{selectedCountry.dial_code}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform duration-300", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 z-[100] mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-elev-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
            <div className="p-3 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search country or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand-500 transition-all"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-1 custom-scrollbar">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm transition-all",
                    selectedCountry.code === country.code 
                      ? "bg-brand-500/10 text-brand-500 font-semibold" 
                      : "hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base leading-none">{country.code.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397))}</span>
                    <span className="truncate">{country.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono opacity-50">{country.dial_code}</span>
                    {selectedCountry.code === country.code && (
                      <Check className="w-4 h-4" />
                    )}
                  </div>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-400">No countries found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Field */}
      <input
        type="tel"
        name={name}
        value={phoneNumber}
        onChange={handlePhoneChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className="flex h-10 w-full bg-transparent px-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium tabular-nums"
      />
    </div>
  );
};
