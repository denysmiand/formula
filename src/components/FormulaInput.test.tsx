import { render, screen, fireEvent } from "@testing-library/react";
import { FormulaInput } from "./FormulaInput";
import {
  useFormulaStore,
  type FormulaState,
  type Tag,
} from "@/store/formulaStore";
import { useAutocomplete } from "@/services/autocompleteService";
import type { UseQueryResult } from "@tanstack/react-query";
import type { AutocompleteResult } from "@/services/autocompleteService";

jest.mock("@/store/formulaStore");
jest.mock("@/services/autocompleteService");

const mockSetCurrentInput = jest.fn();
const mockAddTag = jest.fn();
const mockRemoveTag = jest.fn();
const mockUpdateTagValue = jest.fn();
const mockCalculateTotal = jest.fn();
const mockClearTags = jest.fn();

const mockStore: FormulaState = {
  currentInput: "",
  tags: [],
  setCurrentInput: mockSetCurrentInput,
  addTag: mockAddTag,
  removeTag: mockRemoveTag,
  updateTagValue: mockUpdateTagValue,
  calculateTotal: mockCalculateTotal,
  clearTags: mockClearTags,
};

const mockQueryResult: UseQueryResult<AutocompleteResult[], Error> = {
  data: [],
  dataUpdatedAt: 0,
  error: null,
  errorUpdatedAt: 0,
  failureCount: 0,
  failureReason: null,
  isError: false,
  isFetched: true,
  isFetchedAfterMount: true,
  isFetching: false,
  isLoading: false,
  isLoadingError: false,
  isPaused: false,
  isPending: false,
  isPlaceholderData: false,
  isRefetchError: false,
  isRefetching: false,
  isStale: false,
  isSuccess: true,
  refetch: jest.fn(),
  status: "success",
  fetchStatus: "idle",
  errorUpdateCount: 0,
  isInitialLoading: false,
  promise: Promise.resolve([]),
};

describe("FormulaInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useFormulaStore as unknown as jest.Mock).mockReturnValue(mockStore);
    (useAutocomplete as unknown as jest.Mock).mockReturnValue(mockQueryResult);
  });

  describe("Basic Input Handling", () => {
    it("should handle negative numbers", () => {
      const mockTags = [{ id: "1", text: "-", type: "operand" }];
      (useFormulaStore as unknown as jest.Mock).mockImplementation(() => ({
        currentInput: "",
        tags: mockTags,
        setCurrentInput: mockSetCurrentInput,
        addTag: mockAddTag,
        removeTag: mockRemoveTag,
        updateTagValue: mockUpdateTagValue,
        calculateTotal: mockCalculateTotal,
      }));

      render(<FormulaInput />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "5" } });

      expect(mockRemoveTag).toHaveBeenCalledWith("1");
      expect(mockAddTag).toHaveBeenCalledWith({
        id: expect.any(String),
        text: "-5",
        type: "number",
        value: -5,
        baseValue: -5,
      });
    });
  });

  describe("Operand Handling", () => {
    it("should add operands between numbers", () => {
      const mockTags = [{ id: "1", text: "5", type: "number", value: 5 }];
      const localMockStore = { ...mockStore, tags: mockTags };
      (useFormulaStore as unknown as jest.Mock).mockImplementation(
        () => localMockStore
      );

      render(<FormulaInput />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "+" } });

      expect(mockAddTag).toHaveBeenCalledWith({
        id: expect.any(String),
        text: "+",
        type: "operand",
      });
    });

    it("should not add operands at the start (except minus)", () => {
      render(<FormulaInput />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "+" } });
      expect(mockAddTag).not.toHaveBeenCalled();

      fireEvent.change(input, { target: { value: "-" } });
      expect(mockAddTag).toHaveBeenCalledWith({
        id: expect.any(String),
        text: "-",
        type: "operand",
      });
    });
  });

  describe("Backspace Handling", () => {
    it("should remove the last tag when pressing backspace with empty input", () => {
      const mockTags = [{ id: "1", text: "5", type: "number" }];
      (useFormulaStore as unknown as jest.Mock).mockImplementation(() => ({
        currentInput: "",
        tags: mockTags,
        setCurrentInput: mockSetCurrentInput,
        addTag: mockAddTag,
        removeTag: mockRemoveTag,
        updateTagValue: mockUpdateTagValue,
        calculateTotal: mockCalculateTotal,
      }));

      render(<FormulaInput />);
      const input = screen.getByRole("textbox");

      fireEvent.keyDown(input, { key: "Backspace" });

      expect(mockRemoveTag).toHaveBeenCalledWith("1");
    });
  });

  describe("Autocomplete and Suggestions", () => {
    it("should handle suggestion clicks", () => {
      const mockSuggestions = [
        {
          id: "1",
          name: "variable1",
          category: "variable",
          value: "42",
        },
      ];
      (useAutocomplete as jest.Mock).mockImplementation(() => ({
        data: mockSuggestions,
        isLoading: false,
      }));

      render(<FormulaInput />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: "var" } });
      const suggestion = screen.getByText("variable1");
      fireEvent.click(suggestion);

      expect(mockAddTag).toHaveBeenCalledWith({
        id: "1",
        text: "variable1",
        type: "variable",
        value: 42,
        baseValue: 42,
      });
    });
  });

  describe("Parentheses Handling", () => {
    it("should add opening parenthesis at start or after operand", () => {
      render(<FormulaInput />);
      const input = screen.getByRole("textbox");

      // At start
      fireEvent.change(input, { target: { value: "(" } });
      expect(mockAddTag).toHaveBeenCalledWith({
        id: expect.any(String),
        text: "(",
        type: "parenthesis",
      });

      // After operand
      const mockTagsWithOperand = [{ id: "1", text: "+", type: "operand" }];
      (useFormulaStore as unknown as jest.Mock).mockImplementation(() => ({
        currentInput: "",
        tags: mockTagsWithOperand,
        setCurrentInput: mockSetCurrentInput,
        addTag: mockAddTag,
        removeTag: mockRemoveTag,
        updateTagValue: mockUpdateTagValue,
        calculateTotal: mockCalculateTotal,
      }));

      fireEvent.change(input, { target: { value: "(" } });
      expect(mockAddTag).toHaveBeenCalledTimes(2);
    });

    it("should add closing parenthesis only after a value", () => {
      const mockTags = [
        { id: "1", text: "(", type: "parenthesis" },
        { id: "2", text: "5", type: "number", value: 5 },
      ];
      (useFormulaStore as unknown as jest.Mock).mockImplementation(() => ({
        currentInput: "",
        tags: mockTags,
        setCurrentInput: mockSetCurrentInput,
        addTag: mockAddTag,
        removeTag: mockRemoveTag,
        updateTagValue: mockUpdateTagValue,
        calculateTotal: mockCalculateTotal,
      }));

      render(<FormulaInput />);
      const input = screen.getByRole("textbox");

      fireEvent.change(input, { target: { value: ")" } });
      expect(mockAddTag).toHaveBeenCalledWith({
        id: expect.any(String),
        text: ")",
        type: "parenthesis",
      });
    });
  });
});
