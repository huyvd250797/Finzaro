import { redirect } from "next/navigation";

/** V4.2.0: old analytics entry point is retired, keep bookmarks functional. */
export default function RetiredAnalysisPage() { redirect("/reports"); }
