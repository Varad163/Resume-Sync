package com.acme.payments;

public class TransportConfig {
  private String cipherTransformation = "AES/GCM/NoPadding";

  public String getCipherTransformation() {
    return cipherTransformation;
  }
}
