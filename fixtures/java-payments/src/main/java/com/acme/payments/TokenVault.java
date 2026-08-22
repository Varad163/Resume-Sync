package com.acme.payments;

import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.security.KeyPairGenerator;
import java.security.KeyPair;

/**
 * Wraps card tokens for storage. Tokens are retained for the life of the
 * customer relationship, which is measured in decades.
 */
public class TokenVault {

  private static final int RSA_KEY_BITS = 2048;
  private static final String WRAP_TRANSFORM = "RSA/ECB/PKCS1Padding";

  public KeyPair newWrappingKey() throws Exception {
    KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
    kpg.initialize(RSA_KEY_BITS);
    return kpg.generateKeyPair();
  }

  public byte[] wrapToken(byte[] token, java.security.PublicKey key) throws Exception {
    Cipher cipher = Cipher.getInstance(WRAP_TRANSFORM);
    cipher.init(Cipher.ENCRYPT_MODE, key);
    return cipher.doFinal(token);
  }

  public byte[] encryptAtRest(byte[] plaintext, byte[] keyBytes) throws Exception {
    SecretKeySpec key = new SecretKeySpec(keyBytes, "AES");
    Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
    cipher.init(Cipher.ENCRYPT_MODE, key);
    return cipher.doFinal(plaintext);
  }
}
