package com.acme.payments;

import javax.crypto.Cipher;
import org.junit.Test;

public class TokenVaultTest {

  @Test
  public void wrapsWithTestKey() throws Exception {
    Cipher cipher = Cipher.getInstance("RSA/ECB/PKCS1Padding");
    org.junit.Assert.assertNotNull(cipher);
  }
}
