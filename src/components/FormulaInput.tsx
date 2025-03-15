import React, { useState, useRef, useEffect } from "react";
import { useFormulaStore } from "@/store/formulaStore";
import {
  useAutocomplete,
  AutocompleteResult,
} from "@/services/autocompleteService";

const OPERANDS = ["+", "-", "*", "/"];
const PARENTHESES = ["(", ")"];

export const FormulaInput: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    currentInput,
    tags,
    setCurrentInput,
    addTag,
    removeTag,
    updateTagValue,
    calculateTotal,
  } = useFormulaStore();
  const { data: suggestions, isLoading } = useAutocomplete(searchTerm);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setActiveTagId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentInput(value);

    // Remove operand if it's the first tag (except minus for negative numbers)
    if (
      tags.length === 1 &&
      tags[0].type === "operand" &&
      tags[0].text !== "-"
    ) {
      removeTag(tags[0].id);
    }

    // Check if the input is an operand
    if (OPERANDS.includes(value)) {
      // Allow minus at the start for negative numbers
      if (value === "-" && tags.length === 0) {
        addTag({
          id: Date.now().toString(),
          text: value,
          type: "operand",
        });
        setCurrentInput("");
        return;
      }

      // Only add operand if there's at least one non-operand tag before it
      const hasValueBeforeOperand = tags.some(
        (tag) => tag.type !== "operand" && tag.type !== "parenthesis"
      );
      if (hasValueBeforeOperand) {
        addTag({
          id: Date.now().toString(),
          text: value,
          type: "operand",
        });
        setCurrentInput("");
      }
      return;
    }

    // Handle number input after minus sign
    if (/^\d+$/.test(value) && tags.length === 1 && tags[0].text === "-") {
      const negativeNumber = -Number(value);
      removeTag(tags[0].id); // Remove the minus sign
      addTag({
        id: Date.now().toString(),
        text: negativeNumber.toString(),
        type: "number",
        value: negativeNumber,
        baseValue: negativeNumber,
      });
      setCurrentInput("");
      return;
    }

    // Check if the input is a parenthesis
    if (PARENTHESES.includes(value)) {
      // Allow opening parenthesis at start or after operand
      if (
        value === "(" &&
        (tags.length === 0 || tags[tags.length - 1]?.type === "operand")
      ) {
        addTag({
          id: Date.now().toString(),
          text: value,
          type: "parenthesis",
        });
        setCurrentInput("");
        return;
      }
      // Allow closing parenthesis after a value
      if (
        value === ")" &&
        tags.length > 0 &&
        tags[tags.length - 1]?.type !== "operand"
      ) {
        addTag({
          id: Date.now().toString(),
          text: value,
          type: "parenthesis",
        });
        setCurrentInput("");
      }
      return;
    }

    // Always show dropdown for any input
    setSearchTerm(value);
    setShowDropdown(true);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (currentInput === "") return;

      // Check for power expression (x^y)
      const powerMatch = currentInput.match(/^(\d+)\^(\d+)$/);
      if (powerMatch) {
        const [_, base, exponent] = powerMatch;
        const result = Math.pow(Number(base), Number(exponent));
        addTag({
          id: Date.now().toString(),
          text: result.toString(),
          type: "number",
          value: result,
          baseValue: result,
        });
        setCurrentInput("");
        setShowDropdown(false);
        return;
      }

      // If it's a number and no suggestion is selected, add it as a number tag
      if (/^\d+$/.test(currentInput)) {
        addTag({
          id: Date.now().toString(),
          text: currentInput,
          type: "number",
          value: Number(currentInput),
          baseValue: Number(currentInput),
        });
        setCurrentInput("");
        setShowDropdown(false);
      }
    } else if (
      e.key === "Backspace" &&
      currentInput === "" &&
      tags.length > 0
    ) {
      e.preventDefault();
      const lastTag = tags[tags.length - 1];
      removeTag(lastTag.id);
    }
  };

  const handleSuggestionClick = (suggestion: AutocompleteResult) => {
    // Try to evaluate if the value is an expression
    const calculateExpression = (expr: string) => {
      try {
        // Replace x with * for multiplication
        const sanitizedExpr = expr.replace(/x/g, "*");
        // Only allow numbers, basic operators, and spaces
        if (!/^[\d\s+\-*/().]+$/.test(sanitizedExpr)) {
          return Number(expr);
        }
        return Function(`'use strict'; return (${sanitizedExpr})`)();
      } catch {
        return Number(expr);
      }
    };

    const calculatedValue = calculateExpression(
      suggestion.value?.toString() || "0"
    );

    addTag({
      id: suggestion.id,
      text: suggestion.name,
      type: suggestion.category === "function" ? "function" : "variable",
      value: calculatedValue,
      baseValue: calculatedValue,
    });
    setCurrentInput("");
    setSearchTerm("");
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleTagClick = (tagId: string) => {
    if (activeTagId === tagId) {
      setActiveTagId(null);
    } else {
      setActiveTagId(tagId);
    }
  };

  const total = calculateTotal();

  // Create number suggestion if input is a number
  const numberSuggestion = /^\d+$/.test(currentInput)
    ? [
        {
          id: Date.now().toString(),
          name: currentInput,
          category: "number",
          value: Number(currentInput),
        },
      ]
    : [];

  const allSuggestions = [...numberSuggestion, ...(suggestions || [])];

  return (
    <div className="relative w-full max-w-2xl">
      <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-white shadow-sm">
        {tags.map((tag) => (
          <div key={tag.id} className="relative">
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer ${
                tag.type === "operand"
                  ? "bg-gray-100 text-gray-900"
                  : tag.type === "number"
                  ? "bg-yellow-100 text-yellow-900"
                  : tag.type === "function"
                  ? "bg-blue-100 text-blue-900"
                  : tag.type === "parenthesis"
                  ? "bg-purple-100 text-purple-900"
                  : "bg-green-100 text-green-900"
              }`}
              onClick={() => tag.value !== undefined && handleTagClick(tag.id)}
            >
              <span className="font-medium">{tag.text}</span>
              {tag.value !== undefined && (
                <span className="text-sm text-gray-600 ml-1">
                  ({tag.value})
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag.id);
                }}
                className="ml-1 text-gray-600 hover:text-gray-900 font-bold"
                aria-label="Remove tag"
              >
                ×
              </button>
            </div>
            {activeTagId === tag.id && tag.value !== undefined && (
              <div className="absolute z-20 mt-1 w-32 bg-white border rounded-lg shadow-lg py-1">
                <button
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => {
                    updateTagValue({
                      id: tag.id,
                      text: tag.text,
                      type: tag.type,
                      value: 1,
                    });
                    setActiveTagId(null);
                  }}
                >
                  <span className="font-bold text-gray-900">x1</span>
                </button>
                <button
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => {
                    updateTagValue({
                      id: tag.id,
                      text: tag.text,
                      type: tag.type,
                      value: 3,
                    });
                    setActiveTagId(null);
                  }}
                >
                  <span className="font-bold text-gray-900">x3</span>
                </button>
                <button
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => {
                    updateTagValue({
                      id: tag.id,
                      text: tag.text,
                      type: tag.type,
                      value: 5,
                    });
                    setActiveTagId(null);
                  }}
                >
                  <span className="font-bold text-gray-900">x5</span>
                </button>
              </div>
            )}
          </div>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          className="flex-1 min-w-[100px] outline-none text-gray-900 placeholder-gray-500"
          placeholder={
            tags.length === 0 && currentInput === ""
              ? "Type to search, enter numbers, or use +,-,*,/,(,)"
              : ""
          }
        />
      </div>

      <div className="mt-2 px-2 text-gray-600 text-sm">Result: {total}</div>

      {showDropdown && (allSuggestions?.length ?? 0) > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg"
        >
          {isLoading ? (
            <div className="p-2 text-gray-600">Loading...</div>
          ) : (
            <ul role="list" className="py-1">
              {allSuggestions?.map((suggestion) => (
                <li
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                >
                  <span
                    className={`px-2 py-0.5 rounded text-sm font-medium ${
                      suggestion.category === "function"
                        ? "bg-blue-100 text-blue-900"
                        : suggestion.category === "number"
                        ? "bg-yellow-100 text-yellow-900"
                        : "bg-green-100 text-green-900"
                    }`}
                  >
                    {suggestion.category}
                  </span>
                  <span className="text-gray-900 font-medium">
                    {suggestion.name}
                  </span>
                  {suggestion.value && (
                    <span className="text-sm text-gray-600">
                      {suggestion.value}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
