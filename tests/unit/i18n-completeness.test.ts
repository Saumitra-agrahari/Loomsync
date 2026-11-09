import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import enMessages from "../../messages/en.json";
import taMessages from "../../messages/ta.json";

function getLeafKeyPaths(obj: any, prefix = ""): string[] {
  let paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (obj[key] !== null && typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      paths.push(...getLeafKeyPaths(obj[key], fullPath));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

function getValueByPath(obj: any, pathStr: string): any {
  return pathStr.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

describe("i18n Translation Completeness & Symmetry", () => {
  const enKeys = getLeafKeyPaths(enMessages).sort();
  const taKeys = getLeafKeyPaths(taMessages).sort();

  it("messages/en.json and messages/ta.json have identical key paths", () => {
    const missingInTa = enKeys.filter((k) => !taKeys.includes(k));
    const missingInEn = taKeys.filter((k) => !enKeys.includes(k));

    expect(
      missingInTa,
      `The following keys exist in en.json but are missing in ta.json:\n${missingInTa.join("\n")}`
    ).toEqual([]);

    expect(
      missingInEn,
      `The following keys exist in ta.json but are missing in en.json:\n${missingInEn.join("\n")}`
    ).toEqual([]);

    expect(enKeys.length).toBe(taKeys.length);
  });

  it("no values in messages/en.json are empty or whitespace only", () => {
    for (const key of enKeys) {
      const val = getValueByPath(enMessages, key);
      expect(typeof val, `Value at ${key} in en.json must be a string`).toBe("string");
      expect(val.trim().length, `Value at ${key} in en.json must not be empty`).toBeGreaterThan(0);
    }
  });

  it("no values in messages/ta.json are empty or whitespace only", () => {
    for (const key of taKeys) {
      const val = getValueByPath(taMessages, key);
      expect(typeof val, `Value at ${key} in ta.json must be a string`).toBe("string");
      expect(val.trim().length, `Value at ${key} in ta.json must not be empty`).toBeGreaterThan(0);
    }
  });

  it("contains all core translation domains (common, nav, roles, stages, status, categories, errors, login, board, setup, detail, warnings, supervisor, buyer, runrate)", () => {
    const requiredSections = [
      "common",
      "nav",
      "roles",
      "stages",
      "status",
      "categories",
      "categorySources",
      "errors",
      "greetings",
      "login",
      "board",
      "setup",
      "detail",
      "warnings",
      "supervisor",
      "buyer",
      "runrate",
    ];

    for (const section of requiredSections) {
      expect((enMessages as any)[section], `en.json missing top-level section: ${section}`).toBeDefined();
      expect((taMessages as any)[section], `ta.json missing top-level section: ${section}`).toBeDefined();
    }
  });
});
