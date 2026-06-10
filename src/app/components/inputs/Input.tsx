"use client";

import clsx from "clsx";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";

interface InputProps {
  label: string;
  id: string;
  type?: string;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
  disabled?: boolean;
  onFocus?: (e?: any) => void;
  onBlur?: () => void;
  onChange?: (e?: any) => void;
}

const Input: React.FC<InputProps> = ({
  label,
  id,
  register,
  required,
  errors,
  type = "text",
  disabled,
  onFocus,
  onBlur,
  onChange,
}) => {
  // react-hook-form's register() supplies its own onBlur; compose it so callers
  // can still react to focus/blur (e.g. the password field asks the mascot to
  // cover its eyes) without dropping RHF's validation handler.
  const field = register(id, { required });

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200"
      >
        {label}
      </label>
      <div className="mt-2">
        <input
          id={id}
          type={type}
          autoComplete={id}
          disabled={disabled}
          {...field}
          onChange={(e) => {
            field.onChange(e);
            onChange?.(e);
          }}
          onFocus={onFocus}
          onBlur={(e) => {
            field.onBlur(e);
            onBlur?.();
          }}
          className={clsx(
            `
            form-input
            block 
            w-full 
            rounded-md 
            border-0 
            py-1.5 
            text-gray-900 
            shadow-sm 
            ring-1 
            ring-inset 
            ring-gray-300 
            placeholder:text-ink-soft 
            focus:ring-2 
            focus:ring-inset 
            focus:ring-sky-600 
            sm:text-sm 
            sm:leading-6
            dark:bg-lightgray
            dark:ring-gray-500
            dark:text-white`,
            errors[id] && "focus:ring-rose-500",
            disabled && "opacity-50 cursor-default"
          )}
        />
      </div>
    </div>
  );
};

export default Input;
