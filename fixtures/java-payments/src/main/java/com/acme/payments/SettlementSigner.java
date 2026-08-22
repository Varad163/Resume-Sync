package com.acme.payments;

import java.security.KeyPairGenerator;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;

/** Signs settlement instructions sent to the clearing network. */
public class SettlementSigner {

  public byte[] sign(byte[] instruction, java.security.PrivateKey key) throws Exception {
    Signature signature = Signature.getInstance("SHA256withECDSA");
    signature.initSign(key);
    signature.update(instruction);
    return signature.sign();
  }

  public void generateSigningKey() throws Exception {
    KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
    ECGenParameterSpec spec = new ECGenParameterSpec("secp256r1");
    kpg.initialize(spec);
  }
}
