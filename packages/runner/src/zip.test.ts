import { describe, expect, it } from "vitest";
import { mkdir, rm, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import {
  extractZipSafely,
  isValidZipHeader,
  sanitizeZipEntryPath,
  storeUploadZip,
  removeUploadZip,
  getUploadZipPath,
} from "./zip.js";

describe("zip security & extraction", () => {
  it("validates ZIP magic headers correctly", () => {
    const validHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
    const invalidHeader = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF magic

    expect(isValidZipHeader(validHeader)).toBe(true);
    expect(isValidZipHeader(invalidHeader)).toBe(false);
  });

  it("sanitizes paths and detects Zip Slip path traversal attempts", () => {
    const baseDir = path.resolve("/tmp/test-extract");

    // Valid paths inside baseDir
    expect(sanitizeZipEntryPath(baseDir, "src/main.js")).toBe(path.join(baseDir, "src/main.js"));
    expect(sanitizeZipEntryPath(baseDir, "nested/dir/app.py")).toBe(path.join(baseDir, "nested/dir/app.py"));

    // Zip slip path traversal attempts
    expect(() => sanitizeZipEntryPath(baseDir, "../../etc/passwd")).toThrow(/Zip Slip/);
    expect(() => sanitizeZipEntryPath(baseDir, "src/../../evil.sh")).toThrow(/Zip Slip/);
    expect(() => sanitizeZipEntryPath(baseDir, "/etc/passwd")).toThrow(/Zip Slip/);
    expect(() => sanitizeZipEntryPath(baseDir, "C:\\Windows\\System32\\cmd.exe")).toThrow(/Zip Slip/);
  });

  it("extracts a valid ZIP archive safely to an ephemeral directory", async () => {
    const zip = new AdmZip();
    zip.addFile("src/index.js", Buffer.from("console.log('hello');"));
    zip.addFile("pom.xml", Buffer.from("<project></project>"));
    const zipBuffer = zip.toBuffer();

    const testDir = path.join(tmpdir(), `ironbastion-test-zip-${Date.now()}`);
    const extractDir = path.join(testDir, "extracted");

    await mkdir(testDir, { recursive: true });
    await storeUploadZip("test-tenant", "scan-123", zipBuffer);

    const storedPath = getUploadZipPath("test-tenant", "scan-123");
    const result = await extractZipSafely(storedPath, extractDir);

    expect(result.entryCount).toBe(2);

    const indexContent = await readFile(path.join(extractDir, "src/index.js"), "utf-8");
    expect(indexContent).toBe("console.log('hello');");

    // Cleanup
    await removeUploadZip("test-tenant", "scan-123");
    await rm(testDir, { recursive: true, force: true });
  });

  it("rejects ZIP archives containing Zip Slip path traversal entries during extraction", async () => {
    const dummyName = "DUMMY_PATH_12345";
    const evilName  = "../etc/evil.file"; // exactly 16 bytes
    const zip = new AdmZip();
    zip.addFile(dummyName, Buffer.from("echo hacked"));
    const zipBuffer = zip.toBuffer();
    
    let pos = 0;
    const dummyBuf = Buffer.from(dummyName);
    const evilBuf = Buffer.from(evilName);
    while ((pos = zipBuffer.indexOf(dummyBuf, pos)) !== -1) {
      evilBuf.copy(zipBuffer, pos);
      pos += dummyBuf.length;
    }

    const testDir = path.join(tmpdir(), `ironbastion-test-slip-${Date.now()}`);
    const extractDir = path.join(testDir, "extracted");

    await mkdir(testDir, { recursive: true });
    const storedPath = await storeUploadZip("test-tenant", "scan-slip", zipBuffer);

    await expect(extractZipSafely(storedPath, extractDir)).rejects.toThrow();

    // Cleanup
    await removeUploadZip("test-tenant", "scan-slip");
    await rm(testDir, { recursive: true, force: true });
  });

  it("handles storage creation and removal cleanly", async () => {
    const buffer = Buffer.from("PK\x03\x04sample zip content");
    const storedPath = await storeUploadZip("tenant-abc", "scan-456", buffer);

    const fileStat = await stat(storedPath);
    expect(fileStat.isFile()).toBe(true);

    await removeUploadZip("tenant-abc", "scan-456");
    await expect(stat(storedPath)).rejects.toThrow();
  });
});
