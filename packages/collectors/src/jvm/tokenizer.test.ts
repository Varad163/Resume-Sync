import { describe, expect, it } from "vitest";
import { tokenizeJava } from "./tokenizer.js";

const kinds = (src: string) => tokenizeJava(src).map((t) => `${t.kind}:${t.value}`);

describe("tokenizeJava", () => {
  it("tracks line and column for every token", () => {
    const tokens = tokenizeJava('class A {\n  String s = "AES";\n}');
    const literal = tokens.find((t) => t.kind === "string");
    expect(literal).toMatchObject({ value: "AES", line: 2, column: 14 });
  });

  it("strips quotes and resolves escapes in string literals", () => {
    expect(kinds('String s = "RSA/ECB/PKCS1Padding";')).toContain("string:RSA/ECB/PKCS1Padding");
    expect(tokenizeJava('String s = "a\\"b";').find((t) => t.kind === "string")?.value).toBe('a"b');
    expect(tokenizeJava('String s = "\\u0041ES";').find((t) => t.kind === "string")?.value).toBe("AES");
  });

  it("ignores line and block comments, including crypto inside them", () => {
    const tokens = tokenizeJava('// Cipher.getInstance("RSA")\n/* KeyPairGenerator "DSA" */\nint x = 1;');
    expect(tokens.some((t) => t.kind === "string")).toBe(false);
    expect(tokens.find((t) => t.kind === "number")?.line).toBe(3);
  });

  it("counts lines through block comments and text blocks", () => {
    const src = 'class A {\n  /*\n   *\n   */\n  int x = 1;\n}';
    expect(tokenizeJava(src).find((t) => t.kind === "number")?.line).toBe(5);
  });

  it("reads text blocks as a single string token", () => {
    const src = 'String pem = """\nMIIBIjAN\n""";';
    const literal = tokenizeJava(src).find((t) => t.kind === "string");
    expect(literal?.value.trim()).toBe("MIIBIjAN");
  });

  it("separates keywords from identifiers", () => {
    expect(kinds("public class Vault {}")).toEqual([
      "keyword:public",
      "keyword:class",
      "identifier:Vault",
      "punct:{",
      "punct:}",
    ]);
  });

  it("reads numeric literals including underscores and suffixes", () => {
    expect(kinds("int a = 2_048; long b = 15360L;")).toContain("number:2_048");
    expect(kinds("int a = 2_048; long b = 15360L;")).toContain("number:15360L");
  });

  it("never throws on syntax it does not understand", () => {
    expect(() => tokenizeJava("sealed interface S permits A, B { §§ }")).not.toThrow();
    expect(() => tokenizeJava('String unterminated = "abc')).not.toThrow();
    expect(() => tokenizeJava("/* unterminated")).not.toThrow();
  });
});
