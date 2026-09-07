import type { NavView } from "../components/Sidebar.js";

export type RouteDef =
  | { name: NavView }
  | { name: "scan"; id: string; initialTab?: "certify" | "cbom" }
  | { name: "docs/github" }
  | { name: "docs"; path: string };

export function parsePath(pathname: string): RouteDef {
  const path = pathname.replace(/\/$/, "");
  if (path.startsWith("/docs")) {
    if (path === "/docs/github") return { name: "docs/github" };
    return { name: "docs", path: path || "/docs" };
  }
  if (path.startsWith("/scans/")) {
    const id = path.replace("/scans/", "");
    return { name: "scan", id };
  }
  if (path === "/repositories") return { name: "repositories" };
  if (path === "/scans") return { name: "scans" };
  if (path === "/issues") return { name: "issues" };
  if (path === "/cbom") return { name: "cbom" };
  if (path === "/certify") return { name: "certify" };
  if (path === "/integrations") return { name: "integrations" };
  if (path === "/settings") return { name: "settings" };
  if (path === "/audit") return { name: "audit" };

  return { name: "overview" };
}

export function formatPath(route: RouteDef): string {
  if (route.name === "docs/github") return "/docs/github";
  if (route.name === "docs") return route.path;
  if (route.name === "scan") return `/scans/${route.id}`;
  if (route.name === "overview") return "/";
  return `/${route.name}`;
}
