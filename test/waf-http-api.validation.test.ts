import { App, Stack } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { WafHttpApi } from "../src/index";

describe("WafHttpApi - Validation and Error Handling", () => {
  let app: App;
  let stack: Stack;
  let httpApi: HttpApi;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TestStack");
    httpApi = new HttpApi(stack, "TestApi");
  });

  describe("Domain Validation", () => {
    test("should throw descriptive error for invalid domain format", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "invalid..domain..com",
        });
      }).toThrow(/Invalid domain format/);

      expect(() => {
        new WafHttpApi(stack, "TestWafApi2", {
          httpApi: new HttpApi(stack, "TestApi2"),
          domain: "domain-with-invalid-chars!@#.com",
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should throw descriptive error for empty domain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "",
        });
      }).toThrow(/Domain must be a non-empty string/);
    });

    test("should throw descriptive error for domain exceeding length limit", () => {
      const longDomain = "a".repeat(250) + ".com"; // 254 characters total

      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: longDomain,
        });
      }).toThrow(/Domain name exceeds maximum length/);
    });

    test("should throw descriptive error for multiple wildcards", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "*.*.example.com",
        });
      }).toThrow(/contains multiple wildcards/);
    });

    test("should throw descriptive error for non-string domain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: null as any,
        });
      }).toThrow(/Domain must be a non-empty string/);

      // undefined domain is actually valid (no custom domain)
      expect(() => {
        new WafHttpApi(stack, "TestWafApi2", {
          httpApi: new HttpApi(stack, "TestApi2"),
          domain: undefined,
        });
      }).not.toThrow();
    });
  });

  describe("Domain Format Validation Edge Cases", () => {
    test("should accept valid apex domain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "example.com",
        });
      }).not.toThrow();
    });

    test("should accept valid subdomain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com",
        });
      }).not.toThrow();
    });

    test("should accept valid deep subdomain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "v1.api.example.com",
        });
      }).not.toThrow();
    });

    test("should accept valid wildcard domain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "*.example.com",
        });
      }).not.toThrow();
    });

    test("should accept valid wildcard subdomain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "*.api.example.com",
        });
      }).not.toThrow();
    });

    test("should reject domain with invalid characters", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api_example.com",
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain starting with hyphen", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "-api.example.com",
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain ending with hyphen", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api-.example.com",
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain with consecutive dots", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api..example.com",
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain with single character TLD", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.c",
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain starting with dot", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: ".api.example.com",
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain ending with dot", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com.",
        });
      }).toThrow(/Invalid domain format/);
    });
  });
});
