import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { kpiDefinitionKeys, kpiDefinitionService } from "./kpi-definition.service";

export function useDebouncedValue(value: string, delay = 350) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

export function useDefinitionAssist(name: string, includeSuggestions: boolean) {
  const trimmedName = name.trim();
  const suggestionsName = useDebouncedValue(trimmedName, 450);
  const analysisName = useDebouncedValue(trimmedName, 700);
  const suggestionsEnabled = suggestionsName.length >= 2;
  const analysisEnabled = analysisName.length >= 2;
  const suggestions = useQuery({
    queryKey: kpiDefinitionKeys.suggestions(suggestionsName, 6),
    queryFn: ({ signal }) => kpiDefinitionService.suggestions(suggestionsName, 6, signal),
    enabled: suggestionsEnabled && includeSuggestions,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
    notifyOnChangeProps: ["data", "error"],
  });
  const analysis = useQuery({
    queryKey: kpiDefinitionKeys.analysis(analysisName),
    queryFn: ({ signal }) => kpiDefinitionService.analyze(analysisName, signal),
    enabled: analysisEnabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    notifyOnChangeProps: ["data", "error"],
  });
  return { suggestionsName, analysisName, suggestions, analysis };
}
