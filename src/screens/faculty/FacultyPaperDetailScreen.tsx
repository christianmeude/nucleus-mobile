import { ResearchDetailScreen } from '../main/ResearchDetailScreen';

/**
 * Faculty repository detail is **identical** to the student ResearchDetail — same
 * screen, same data path, reached from the shared Browse. Kept as a thin alias so
 * the faculty stack's `FacultyPaperDetail` route renders the exact student
 * experience (metadata, bookmark, blurred preview → sheet, related papers), with
 * no parallel implementation to drift. `ResearchDetailScreen` reads its `paperId`
 * from the route and pushes related papers back onto whatever route it is mounted
 * under, so it works unchanged under this route name.
 */
export const FacultyPaperDetailScreen = ResearchDetailScreen;
