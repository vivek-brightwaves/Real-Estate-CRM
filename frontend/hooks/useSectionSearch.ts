"use client";

import { Dispatch, SetStateAction, useEffect } from "react";

export function useSectionSearch(
  section: string,
  setSearch: Dispatch<SetStateAction<string>>,
) {
  useEffect(() => {
    const syncFromUrl = () => {
      setSearch(
        new URLSearchParams(window.location.search).get("search") ?? "",
      );
    };
    const syncFromHeader = (event: Event) => {
      setSearch((event as CustomEvent<string>).detail ?? "");
    };
    syncFromUrl();
    window.addEventListener(`crm:search:${section}`, syncFromHeader);
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener(`crm:search:${section}`, syncFromHeader);
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, [section, setSearch]);
}
