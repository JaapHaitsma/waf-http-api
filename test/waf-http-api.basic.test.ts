import { App, Stack } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
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

      // But different secret values
      expect(wafApi1.secretHeaderValue).not.toBe(wafApi2.secretHeaderValue);
      expect(wafApi1.secretHeaderValue).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(wafApi2.secretHeaderValue).toHaveLength(32);
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
      expect(wafApi.secretHeaderValue).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(wafApi.secretHeaderValue).toMatch(/^[a-f0-9]{32}$/);
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
});
