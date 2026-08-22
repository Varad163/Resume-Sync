package com.acme.payments;

import javax.crypto.Cipher;
import java.security.MessageDigest;
import java.security.SecureRandom;

/** The 2009 ledger integration. Still in the settlement path. */
public class LegacyLedger {

  public String checksum(byte[] record) throws Exception {
    MessageDigest digest = MessageDigest.getInstance("MD5");
    return new String(digest.digest(record));
  }

  public String legacyFingerprint(byte[] record) throws Exception {
    MessageDigest digest = MessageDigest.getInstance("SHA-1");
    return new String(digest.digest(record));
  }

  public byte[] encryptBatch(byte[] batch, java.security.Key key) throws Exception {
    Cipher cipher = Cipher.getInstance("DESede/CBC/PKCS5Padding");
    cipher.init(Cipher.ENCRYPT_MODE, key);
    return cipher.doFinal(batch);
  }

  public byte[] nonce() throws Exception {
    SecureRandom random = SecureRandom.getInstance("SHA1PRNG");
    byte[] out = new byte[16];
    random.nextBytes(out);
    return out;
  }
}
