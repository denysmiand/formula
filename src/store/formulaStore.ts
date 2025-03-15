import { create } from "zustand";

export interface Tag {
  id: string;
  text: string;
  type: "function" | "variable" | "operand" | "number" | "parenthesis";
  value?: number;
  baseValue?: number; // Store the original value for multiplier calculations
}

interface FormulaState {
  currentInput: string;
  tags: Tag[];
  setCurrentInput: (input: string) => void;
  addTag: (tag: Tag) => void;
  removeTag: (id: string) => void;
  clearTags: () => void;
  updateTagValue: (tagWithValue: Tag) => void;
  calculateTotal: () => number;
}

export const useFormulaStore = create<FormulaState>((set, get) => ({
  currentInput: "",
  tags: [],
  setCurrentInput: (input) => set({ currentInput: input }),
  addTag: (tag) =>
    set((state) => {
      const newTags = [...state.tags];

      // If adding an operand and the last tag was an operand, replace it
      if (tag.type === "operand" && newTags.length > 0) {
        const lastTag = newTags[newTags.length - 1];
        if (lastTag?.type === "operand") {
          newTags.pop();
        }
      }

      return { tags: [...newTags, tag] };
    }),
  removeTag: (id) =>
    set((state) => ({ tags: state.tags.filter((tag) => tag.id !== id) })),
  clearTags: () => set({ tags: [] }),
  updateTagValue: (tagWithValue) =>
    set((state) => ({
      tags: state.tags.map((tag) => {
        if (tag.id !== tagWithValue.id) return tag;

        if (tag.type === "number") {
          // For number type, use the text value as base
          const baseValue = Number(tag.text);
          return {
            ...tag,
            value: baseValue * (tagWithValue.value ?? 1),
          };
        } else if (tag.value !== undefined) {
          // For other types with value
          return {
            ...tag,
            baseValue: tag.baseValue ?? tag.value,
            value: (tag.baseValue ?? tag.value) * (tagWithValue.value ?? 1),
          };
        }
        return tag;
      }),
    })),
  calculateTotal: () => {
    const { tags } = get();
    let total = 0;
    let currentOp = "+";
    let stack = [0];
    let opStack = ["+"];

    // Don't process if there are no tags or only operands/parentheses
    if (
      tags.length === 0 ||
      tags.every((tag) => tag.type === "operand" || tag.type === "parenthesis")
    ) {
      return 0;
    }

    // Ignore trailing operand by filtering it out if it's the last tag
    const lastTag = tags[tags.length - 1];
    const tagsToProcess =
      tags.length > 0 && lastTag?.type === "operand" ? tags.slice(0, -1) : tags;

    for (const tag of tagsToProcess) {
      if (tag.type === "operand") {
        currentOp = tag.text;
      } else if (tag.type === "parenthesis") {
        if (tag.text === "(") {
          stack.push(0);
          opStack.push(currentOp);
          currentOp = "+";
        } else if (tag.text === ")") {
          const value = stack.pop() ?? 0;
          const op = opStack.pop() ?? "+";
          const prevValue = stack.pop() ?? 0;
          stack.push(calculateValue(prevValue, value, op));
        }
      } else if (tag.type === "number" || tag.value !== undefined) {
        const value =
          tag.type === "number"
            ? tag.value ?? Number(tag.text)
            : tag.value ?? 0;
        const lastValue = stack.pop() ?? 0;
        stack.push(calculateValue(lastValue, value, currentOp));
      }
    }

    return stack[0] ?? 0;
  },
}));

function calculateValue(a: number, b: number, operator: string): number {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b !== 0 ? a / b : a;
    default:
      return b;
  }
}
