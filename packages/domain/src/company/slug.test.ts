import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Barbearia do João")).toBe("barbearia-do-joao");
  });

  it("strips accents", () => {
    expect(slugify("Estética & Beleza")).toBe("estetica-beleza");
  });

  it("trims leading/trailing hyphens from punctuation", () => {
    expect(slugify("--Salão!--")).toBe("salao");
  });

  it("collapses repeated separators", () => {
    expect(slugify("A   B---C")).toBe("a-b-c");
  });
});
