import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";

type Option = {
  value: string;
  label: string;
};

type CheckboxMultiSelectProps = {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
};

export function CheckboxMultiSelect({
  label,
  options,
  selected,
  onChange,
}: CheckboxMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  const selectedOptions = options.filter((option) =>
    selected.includes(option.value),
  );
  const visibleCount = useMultiSelectVisibleCount(containerRef, selectedOptions.map((option) => option.label));
  const visibleOptions = selectedOptions.slice(0, visibleCount);
  const hiddenCount = selectedOptions.length - visibleOptions.length;
  const remove = (event: React.MouseEvent | React.KeyboardEvent, value: string) => {
    event.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  return (
    <div className="checkbox-multiselect" ref={containerRef}>
      <button
        type="button"
        className={open ? "open" : ""}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selectedOptions.length === 0 ? (
          <span className="multiselect-placeholder">{label}</span>
        ) : (
          <span className={`filter-chip-list ${hiddenCount > 0 ? "has-more" : ""}`}>
            {visibleOptions.map((option) => (
              <span className="filter-chip" key={option.value}>
                <span>{option.label}</span>
                <span
                  className="filter-chip-remove"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${option.label}`}
                  onClick={(event) => remove(event, option.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") remove(event, option.value);
                  }}
                >
                  <X size={12} />
                </span>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="filter-chip more">
                <span>+{hiddenCount} more</span>
                <span
                  className="filter-chip-remove"
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${hiddenCount} additional selections`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(visibleOptions.map((option) => option.value));
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.stopPropagation();
                      onChange(visibleOptions.map((option) => option.value));
                    }
                  }}
                >
                  <X size={12} />
                </span>
              </span>
            )}
          </span>
        )}
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="checkbox-options" role="listbox" aria-multiselectable="true">
          <button
            type="button"
            className={selected.length === 0 ? "selected" : ""}
            onClick={() => onChange([])}
          >
            <span className="checkbox-box">
              {selected.length === 0 && <Check size={13} />}
            </span>
            All
          </button>
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <button
                type="button"
                className={isSelected ? "selected" : ""}
                key={option.value}
                onClick={() => toggle(option.value)}
              >
                <span className="checkbox-box">
                  {isSelected && <Check size={13} />}
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
