package com.acme.gateway;

import javax.crypto.KeyAgreement;
import javax.net.ssl.SSLContext;
import java.security.KeyStore;

/** Talks to the acquiring bank. */
public class GatewayClient {

  public SSLContext context() throws Exception {
    return SSLContext.getInstance("TLSv1.2");
  }

  public KeyStore keystore() throws Exception {
    return KeyStore.getInstance("PKCS12");
  }

  public KeyAgreement agreement() throws Exception {
    return KeyAgreement.getInstance("ECDH");
  }
}
