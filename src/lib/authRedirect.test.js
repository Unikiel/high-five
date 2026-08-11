import { describe, expect, it } from "vitest";
import { AUTHED_HOME, resolvePostAuthPath } from "@/lib/authRedirect";

describe("resolvePostAuthPath", () => {
  it("returns the authed home when there is no origin", () => {
    expect(resolvePostAuthPath({})).toBe(AUTHED_HOME);
    expect(resolvePostAuthPath(null)).toBe(AUTHED_HOME);
  });

  it("returns the requested path with its search and hash", () => {
    const location = { state: { from: { pathname: "/courses", search: "?q=1", hash: "#top" } } };
    expect(resolvePostAuthPath(location)).toBe("/courses?q=1#top");
  });

  it("omits search and hash when they are absent", () => {
    expect(resolvePostAuthPath({ state: { from: { pathname: "/courses" } } })).toBe("/courses");
  });

  it("never bounces back to an auth route", () => {
    for (const pathname of ["/login", "/register", "/forgot-password", "/reset-password"]) {
      expect(resolvePostAuthPath({ state: { from: { pathname } } })).toBe(AUTHED_HOME);
    }
  });

  it("sends the site root to the authed home", () => {
    expect(resolvePostAuthPath({ state: { from: { pathname: "/" } } })).toBe(AUTHED_HOME);
  });

  it("rejects protocol-relative and non-absolute paths", () => {
    expect(resolvePostAuthPath({ state: { from: { pathname: "//evil.com" } } })).toBe(AUTHED_HOME);
    expect(resolvePostAuthPath({ state: { from: { pathname: "evil.com" } } })).toBe(AUTHED_HOME);
  });
});
