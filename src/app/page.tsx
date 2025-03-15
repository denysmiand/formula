"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FormulaInput } from "@/components/FormulaInput";

const queryClient = new QueryClient();

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="w-full max-w-2xl">
          <h1 className="text-3xl font-bold mb-8 text-center">Formula Input</h1>
          <FormulaInput />
        </div>
      </main>
    </QueryClientProvider>
  );
}
