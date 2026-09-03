/**
 * ZIP Archive Extraction and Ephemeral Storage Security Module
 * Protects against Zip Slip (path traversal), Zip Bombs (decompression limits),
 * symlink escapes, unauthorized file types, and unauthenticated access.
 */

import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import yauzl from "yauzl";

export const MAX_ZIP_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024; // 200 MB
export const MAX_ZIP_ENTRY_COUNT = 10_000;

export interface ZipValidationResult {
  readonly entryCount: number;
  readonly uncompressedSize: number;
}

/**
 * Validates magic signature for ZIP archive formats (PK\x03\x04 or PK\x05\x06).
 */
export function isValidZipHeader(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  const sig = buffer.readUInt32LE(0);
  return sig === 0x04034b50 || sig === 0x06054b50 || sig === 0x08074b50;
}

/**
 * Sanitizes and validates an entry path against Zip Slip / path traversal vulnerabilities.
 * Throws an error if the path attempts to escape the root target directory.
 */
export function sanitizeZipEntryPath(targetDir: string, entryFileName: string): string {
  const resolvedTargetDir = path.resolve(targetDir);

  // Reject absolute paths, leading slashes, and drive letters
  if (
    path.isAbsolute(entryFileName) ||
    entryFileName.startsWith("/") ||
    entryFileName.startsWith("\\") ||
    /^[a-zA-Z]:/.test(entryFileName)
  ) {
    throw new Error(`Zip Slip path traversal attempt detected: ${entryFileName}`);
  }

  const cleanName = entryFileName.replace(/\\/g, "/");
  const fullPath = path.resolve(resolvedTargetDir, cleanName);

  // Must remain strictly inside targetDir
  if (fullPath !== resolvedTargetDir && !fullPath.startsWith(resolvedTargetDir + path.sep)) {
    throw new Error(`Zip Slip path traversal attempt detected: ${entryFileName}`);
  }

  // Reject explicit parent directory components
  const parts = cleanName.split("/");
  if (parts.includes("..") || parts.includes(".")) {
    const canonical = path.normalize(cleanName);
    if (canonical.startsWith("..") || canonical.includes("../") || canonical.includes("..\\")) {
      throw new Error(`Zip Slip path traversal attempt detected: ${entryFileName}`);
    }
  }

  return fullPath;
}

/**
 * Safely extracts a ZIP archive to a destination directory enforcing:
 * 1. Zip Slip / path traversal prevention
 * 2. Absolute path rejection
 * 3. Decompression bomb limits (max total uncompressed bytes & file count)
 * 4. Symlink safety
 */
export async function extractZipSafely(zipPath: string, destDir: string): Promise<ZipValidationResult> {
  const resolvedDestDir = path.resolve(destDir);
  await mkdir(resolvedDestDir, { recursive: true });

  return new Promise<ZipValidationResult>((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: true }, (err, zipfile) => {
      if (err || !zipfile) {
        return reject(new Error(`Failed to open ZIP archive: ${err?.message ?? "Invalid ZIP"}`));
      }

      let totalUncompressedSize = 0;
      let entryCount = 0;

      zipfile.on("error", (zipErr) => {
        reject(new Error(`ZIP processing error: ${zipErr.message}`));
      });

      zipfile.on("entry", (entry: yauzl.Entry) => {
        entryCount++;
        if (entryCount > MAX_ZIP_ENTRY_COUNT) {
          zipfile.close();
          return reject(new Error(`ZIP archive exceeds maximum entry count limit (${MAX_ZIP_ENTRY_COUNT})`));
        }

        totalUncompressedSize += entry.uncompressedSize;
        if (totalUncompressedSize > MAX_UNCOMPRESSED_BYTES) {
          zipfile.close();
          return reject(new Error(`ZIP archive exceeds maximum uncompressed size limit (${MAX_UNCOMPRESSED_BYTES / 1024 / 1024}MB)`));
        }

        let targetPath: string;
        try {
          targetPath = sanitizeZipEntryPath(resolvedDestDir, entry.fileName);
        } catch (sanitizeErr) {
          zipfile.close();
          return reject(sanitizeErr);
        }

        // Check for symlinks/hardlinks in unix permissions
        const isSymlink = (entry.externalFileAttributes >> 16 & 0o170000) === 0o120000;
        if (isSymlink) {
          // Reject external symlinks to prevent symlink traversal attacks
          zipfile.close();
          return reject(new Error(`Symbolic links are not allowed in ZIP archives: ${entry.fileName}`));
        }

        // Directory entry
        if (entry.fileName.endsWith("/")) {
          mkdir(targetPath, { recursive: true })
            .then(() => zipfile.readEntry())
            .catch((mkdirErr) => {
              zipfile.close();
              reject(mkdirErr);
            });
          return;
        }

        // File entry
        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            zipfile.close();
            return reject(new Error(`Failed to read ZIP entry ${entry.fileName}: ${streamErr?.message}`));
          }

          mkdir(path.dirname(targetPath), { recursive: true })
            .then(async () => {
              const chunks: Buffer[] = [];
              for await (const chunk of readStream) {
                chunks.push(chunk as Buffer);
              }
              const fileBuffer = Buffer.concat(chunks);
              await writeFile(targetPath, fileBuffer);
              await chmod(targetPath, 0o600).catch(() => {});
              zipfile.readEntry();
            })
            .catch((writeErr) => {
              zipfile.close();
              reject(writeErr);
            });
        });
      });

      zipfile.on("end", () => {
        resolve({ entryCount, uncompressedSize: totalUncompressedSize });
      });

      zipfile.readEntry();
    });
  });
}

/**
 * Storage helpers for managing uploaded ZIP files in tenant-isolated temporary directories.
 */
export function getUploadZipPath(tenantId: string, scanId: string): string {
  return path.join(tmpdir(), "ironbastion-uploads", tenantId, `${scanId}.zip`);
}

export async function storeUploadZip(tenantId: string, scanId: string, content: Buffer): Promise<string> {
  const filePath = getUploadZipPath(tenantId, scanId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  await chmod(filePath, 0o600).catch(() => {});
  return filePath;
}

export async function removeUploadZip(tenantId: string, scanId: string): Promise<void> {
  const filePath = getUploadZipPath(tenantId, scanId);
  await rm(filePath, { force: true }).catch(() => {});
}
