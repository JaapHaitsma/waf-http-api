import { App, Stack, Token } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import { WafHttpApi } from "../src/index";

describe("WafHttpApi - Basic Functionality", () => {
  let app: App;
  let stack: Stack;
  let httpApi: HttpApi;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TestStack");
    httpApi = new HttpApi(stack, "TestApi");
  });

  describe("Static Properties and Constants", () => {
    test("should expose correct secret header name constant", () => {
      expect(WafHttpApi.SECRET_HEADER_NAME).toBe("X-Origin-Verify");
    });

    test("should maintain consistent secret header name across instances", () => {
      const wafApi1 = new WafHttpApi(stack, "TestWafApi1", { httpApi });
      const wafApi2 = new WafHttpApi(stack, "TestWafApi2", {
        httpApi: new HttpApi(stack, "TestApi2"),
      });

      // Both instances should use the same header name
      expect(WafHttpApi.SECRET_HEADER_NAME).toBe("X-Origin-Verify");

      // But each gets its own secret, so the values differ
      expect(wafApi1.secretHeaderValue).not.toBe(wafApi2.secretHeaderValue);
      expect(wafApi1.originSecret).not.toBe(wafApi2.originSecret);
    });
  });

  describe("Property Exposure and Access", () => {
    test("should expose distribution property", () => {
      const wafApi = new WafHttpApi(stack, "TestWafApi", { httpApi });

      expect(wafApi.distribution).toBeDefined();
      expect(wafApi.distribution.distributionDomainName).toBeDefined();
      expect(wafApi.distribution.distributionArn).toBeDefined();
      expect(wafApi.distribution.distributionId).toBeDefined();
    });

    test("should expose secretHeaderValue property", () => {
      const wafApi = new WafHttpApi(stack, "TestWafApi", { httpApi });

      expect(wafApi.secretHeaderValue).toBeDefined();
      expect(typeof wafApi.secretHeaderValue).toBe("string");
    });

    test("should have undefined properties when not applicable", () => {
      const wafApi = new WafHttpApi(stack, "TestWafApi", { httpApi });

      // Without domain configuration
      expect(wafApi.customDomain).toBeUndefined();
      expect(wafApi.certificate).toBeUndefined();
      expect(wafApi.aRecord).toBeUndefined();
      expect(wafApi.aaaaRecord).toBeUndefined();
    });
  });

  describe("Resource Tagging", () => {
    test.each([
      "AWS::WAFv2::WebACL",
      "AWS::SecretsManager::Secret",
      "AWS::CloudFront::Distribution",
    ])("should tag the %s with the construct path", (resourceType) => {
      new WafHttpApi(stack, "ProtectedApi", { httpApi });

      Template.fromStack(stack).hasResourceProperties(
        resourceType,
        Match.objectLike({
          Tags: Match.arrayWith([
            { Key: "waf-http-api:construct", Value: "TestStack/ProtectedApi" },
          ]),
        }),
      );
    });

    test("should tag the auto-generated certificate, which cannot be named", () => {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
        stack,
        "TestZone",
        { hostedZoneId: "Z1234567890ABC", zoneName: "example.com" },
      );
      new WafHttpApi(stack, "ProtectedApi", {
        httpApi,
        domain: "api.example.com",
        hostedZone,
      });

      Template.fromStack(stack).hasResourceProperties(
        "AWS::CertificateManager::Certificate",
        Match.objectLike({
          Tags: Match.arrayWith([
            { Key: "waf-http-api:construct", Value: "TestStack/ProtectedApi" },
          ]),
        }),
      );
    });
  });

  describe("Origin Secret Modes", () => {
    test("should manage the origin secret by default", () => {
      const wafApi = new WafHttpApi(stack, "TestWafApi", { httpApi });

      expect(wafApi.originSecret).toBeDefined();
      // The value is a deploy-time token, not an inspectable string.
      expect(Token.isUnresolved(wafApi.secretHeaderValue)).toBe(true);
    });

    test("should use the provided secretHeaderValue verbatim", () => {
      const wafApi = new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        secretHeaderValue: "stable-origin-verify-secret-001",
      });

      expect(wafApi.secretHeaderValue).toBe("stable-origin-verify-secret-001");
      expect(wafApi.originSecret).toBeUndefined();
    });

    test("should share the same value across instances given the same secretHeaderValue", () => {
      const wafApi1 = new WafHttpApi(stack, "TestWafApi1", {
        httpApi,
        secretHeaderValue: "stable-origin-verify-secret-001",
      });
      const wafApi2 = new WafHttpApi(stack, "TestWafApi2", {
        httpApi: new HttpApi(stack, "TestApi2"),
        secretHeaderValue: "stable-origin-verify-secret-001",
      });

      expect(wafApi1.secretHeaderValue).toBe(wafApi2.secretHeaderValue);
    });
  });
});
