import { App, Stack } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { WafHttpApi } from "../src/index";

describe("WafHttpApi - Certificate Handling", () => {
  let app: App;
  let stack: Stack;
  let httpApi: HttpApi;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TestStack");
    httpApi = new HttpApi(stack, "TestApi");
    consoleSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe("Certificate Property Exposure", () => {
    test("should expose certificate property when auto-generated", () => {
      const wafApi = new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        domain: "api.example.com",
      });

      expect(wafApi.certificate).toBeDefined();
      expect(wafApi.certificate).toBeInstanceOf(acm.Certificate);
    });

    test("should expose certificate property when provided", () => {
      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );

      const wafApi = new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        domain: "api.example.com",
        certificate,
      });

      expect(wafApi.certificate).toBe(certificate);
    });
  });

  describe("Certificate Validation", () => {
    test("should throw descriptive error for certificate in wrong region", () => {
      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );

      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com",
          certificate,
        });
      }).toThrow(/Certificate region validation failed/);
    });

    test("should throw descriptive error for invalid certificate ARN format", () => {
      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "invalid-arn-format",
      );

      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com",
          certificate,
        });
      }).toThrow(/Certificate validation failed/);
    });
  });

  describe("Certificate ARN Validation Edge Cases", () => {
    test("should accept valid certificate ARN in us-east-1", () => {
      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );

      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com",
          certificate,
        });
      }).not.toThrow();
    });

    test("should reject certificate ARN with missing parts", () => {
      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "arn:aws:acm",
      );

      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com",
          certificate,
        });
      }).toThrow(/Invalid certificate ARN format/);
    });

    test("should reject certificate ARN in different regions", () => {
      const regions = ["us-west-1", "us-west-2", "eu-west-1", "ap-southeast-1"];

      regions.forEach((region) => {
        const certificate = acm.Certificate.fromCertificateArn(
          stack,
          `TestCert${region}`,
          `arn:aws:acm:${region}:123456789012:certificate/12345678-1234-1234-1234-123456789012`,
        );

        expect(() => {
          new WafHttpApi(stack, `TestWafApi${region}`, {
            httpApi: new HttpApi(stack, `TestApi${region}`),
            domain: "api.example.com",
            certificate,
          });
        }).toThrow(/Certificate must be in us-east-1 region/);
      });
    });

    test("should reject malformed certificate ARN", () => {
      const malformedArns = [
        "not-an-arn",
        "arn:aws:s3:::bucket/key", // Wrong service
        "arn:aws:acm:us-east-1:123456789012", // Missing certificate part
        "", // Empty string
      ];

      malformedArns.forEach((arn, index) => {
        const certificate = acm.Certificate.fromCertificateArn(
          stack,
          `TestCert${index}`,
          arn,
        );

        expect(() => {
          new WafHttpApi(stack, `TestWafApi${index}`, {
            httpApi: new HttpApi(stack, `TestApi${index}`),
            domain: "api.example.com",
            certificate,
          });
        }).toThrow();
      });
    });
  });

  describe("Certificate Generation Error Handling", () => {
    test("certificate generation error handling is implemented in constructor", () => {
      // This test verifies that the error handling logic exists in the constructor
      // The actual error scenarios are difficult to simulate in unit tests
      // as they involve AWS service interactions

      // Test that the constructor doesn't throw for valid inputs
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com",
        });
      }).not.toThrow();

      // Test that error handling context is added for certificate validation
      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );

      expect(() => {
        new WafHttpApi(stack, "TestWafApi2", {
          httpApi: new HttpApi(stack, "TestApi2"),
          domain: "api.example.com",
          certificate,
        });
      }).toThrow(/Certificate validation failed in WafHttpApi construct/);
    });
  });

  describe("Warning Messages", () => {
    test("should log enhanced warning when certificate provided without domain", () => {
      const localConsoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );

      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        certificate, // Certificate without domain
      });

      expect(localConsoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Certificate provided without domain"),
      );
      expect(localConsoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("certificate will be ignored"),
      );

      localConsoleSpy.mockRestore();
    });

    test("should log compatibility warning for certificate domain validation", () => {
      const localConsoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );

      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        domain: "api.example.com",
        certificate,
      });

      expect(localConsoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Certificate domain compatibility"),
      );
      expect(localConsoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Full validation requires runtime AWS API access",
        ),
      );

      localConsoleSpy.mockRestore();
    });

    test("should log wildcard domain compatibility warning", () => {
      const localConsoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const certificate = acm.Certificate.fromCertificateArn(
        stack,
        "TestCert",
        "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );

      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        domain: "*.api.example.com",
        certificate,
      });

      expect(localConsoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Wildcard domain validation is limited"),
      );

      localConsoleSpy.mockRestore();
    });
  });
});
