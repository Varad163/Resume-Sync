package com.acme.payments;

import javax.crypto.Cipher;
import javax.net.ssl.SSLContext;

/** Transport security, configured per deployment. */
public class ConfigurableTransport {

  private final TransportConfig config;

  public ConfigurableTransport(TransportConfig config) {
    this.config = config;
  }

  public Cipher cipher() throws Exception {
    return Cipher.getInstance(config.getCipherTransformation());
  }

  public SSLContext tls() throws Exception {
    return SSLContext.getInstance("TLSv1.2");
  }
}
