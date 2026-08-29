export interface BrowseFilterState {
  categories: string[];
  departments: string[];
  programs: string[];
  yearFrom: string;
  yearTo: string;
}

export const INITIAL_FILTER_STATE: BrowseFilterState = {
  categories: [],
  departments: [],
  programs: [],
  yearFrom: '',
  yearTo: '',
};

export const getActiveFilterCount = (state: BrowseFilterState): number => {
  return (
    state.categories.length +
    state.departments.length +
    state.programs.length +
    (state.yearFrom || state.yearTo ? 1 : 0)
  );
};
