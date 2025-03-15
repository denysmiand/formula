import { useQuery } from "@tanstack/react-query";

export interface AutocompleteResult {
  id: string;
  name: string;
  category: string;
  value: string | number;
}

const fetchAutocomplete = async (
  searchTerm: string
): Promise<AutocompleteResult[]> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("API URL is not configured");
  }

  try {
    const response = await fetch(
      `${apiUrl}?search=${encodeURIComponent(searchTerm)}`
    );
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching autocomplete suggestions:", error);
    // Fallback to mock data in case of API failure
    return [];
  }
};

export const useAutocomplete = (searchTerm: string) => {
  return useQuery({
    queryKey: ["autocomplete", searchTerm],
    queryFn: () => fetchAutocomplete(searchTerm),
    enabled: searchTerm.length > 0,
  });
};
