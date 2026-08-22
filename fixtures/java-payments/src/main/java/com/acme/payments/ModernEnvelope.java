package com.acme.payments;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import java.security.MessageDigest;

/** The 2024 rewrite. Already on strong symmetric parameters. */
public class ModernEnvelope {

  public byte[] seal(byte[] payload, java.security.Key key) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key);
    return cipher.doFinal(payload);
  }

  public javax.crypto.SecretKey dataKey() throws Exception {
    KeyGenerator generator = KeyGenerator.getInstance("AES");
    generator.init(256);
    return generator.generateKey();
  }

  public byte[] digest(byte[] payload) throws Exception {
    return MessageDigest.getInstance("SHA-384").digest(payload);
  }
}
