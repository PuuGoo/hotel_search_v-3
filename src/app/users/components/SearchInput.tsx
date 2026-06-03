"use client";

import { ChangeEvent, Dispatch, SetStateAction, useEffect, useRef } from "react";

// Lightweight native debounce (~150 bytes) instead of importing lodash/debounce
// (~1.5 KB gzipped). Already tree-shaken but this eliminates the dependency
// completely from the bundle.
function useDebounce(callback: (value: string) => void, delay: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const debounced = useRef((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => callbackRef.current(value), delay);
  }).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return debounced;
}

interface SearchInputProps {
  placeholder?: string;
  id: string;
  setSearchBy: Dispatch<SetStateAction<string>>;
}

const SearchInput: React.FC<SearchInputProps> = ({ placeholder, id, setSearchBy }) => {
  const debouncedSearch = useDebounce(setSearchBy, 300);

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  return (
    <input
      id={id}
      autoComplete={id}
      placeholder={placeholder}
      onChange={handleSearch}
      className="
          text-black
          font-light
          mb-2
          py-2
          px-4
          bg-neutral-100 
          dark:bg-lightgray
          w-full 
          rounded-full
          focus:outline-none
          dark:text-white
        "
    />
  );
};

export default SearchInput;
