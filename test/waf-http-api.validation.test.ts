import { App, SecretValue, Stack } from "aws-cdk-lib";
import { Annotations, Match } from "aws-cdk-lib/assertions";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import { WafHttpApi } from "../src/index";

describe("WafHttpApi - Validation and Error Handling", () => {
  let app: App;
  let stack: Stack;
  let httpApi: HttpApi;
  let hostedZone: route53.IHostedZone;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TestStack");
    httpApi = new HttpApi(stack, "TestApi");
    hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      stack,
      "TestZone",
      {
        hostedZoneId: "Z1234567890ABC",
        zoneName: "example.com",
      },
    );
  });

  describe("Domain Validation", () => {
    test("should throw hosted zone requirement error before domain format validation", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "invalid..domain..com",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);

      expect(() => {
        new WafHttpApi(stack, "TestWafApi2", {
          httpApi: new HttpApi(stack, "TestApi2"),
          domain: "domain-with-invalid-chars!@#.com",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should throw descriptive error for invalid domain format when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "invalid..domain..com",
          hostedZone,
        });
      }).toThrow(/Invalid domain format/);

      expect(() => {
        new WafHttpApi(stack, "TestWafApi2", {
          httpApi: new HttpApi(stack, "TestApi2"),
          domain: "domain-with-invalid-chars!@#.com",
          hostedZone: route53.HostedZone.fromHostedZoneAttributes(
            stack,
            "TestZone2",
            {
              hostedZoneId: "Z1234567890DEF",
              zoneName: "example.com",
            },
          ),
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should throw hosted zone requirement error for empty domain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should throw descriptive error for empty domain when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "",
          hostedZone,
        });
      }).toThrow(/Domain must be a non-empty string/);
    });

    test("should throw hosted zone requirement error for domain exceeding length limit", () => {
      const longDomain = "a".repeat(250) + ".com"; // 254 characters total

      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: longDomain,
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should throw descriptive error for domain exceeding length limit when hosted zone is provided", () => {
      const longDomain = "a".repeat(250) + ".com"; // 254 characters total

      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: longDomain,
          hostedZone,
        });
      }).toThrow(/Domain name exceeds maximum length/);
    });

    test("should throw hosted zone requirement error for multiple wildcards", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "*.*.example.com",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should throw descriptive error for multiple wildcards when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "*.*.example.com",
          hostedZone,
        });
      }).toThrow(/contains multiple wildcards/);
    });

    test("should throw hosted zone requirement error for non-string domain", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: null as any,
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);

      // undefined domain is actually valid (no custom domain)
      expect(() => {
        new WafHttpApi(stack, "TestWafApi2", {
          httpApi: new HttpApi(stack, "TestApi2"),
          domain: undefined,
        });
      }).not.toThrow();
    });

    test("should throw descriptive error for non-string domain when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: null as any,
          hostedZone,
        });
      }).toThrow(/Domain must be a non-empty string/);
    });
  });

  describe("Domain Format Validation Edge Cases", () => {
    test("should accept valid apex domain with hosted zone", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "example.com",
          hostedZone,
        });
      }).not.toThrow();
    });

    test("should accept valid subdomain with hosted zone", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com",
          hostedZone,
        });
      }).not.toThrow();
    });

    test("should accept valid deep subdomain with hosted zone", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "v1.api.example.com",
          hostedZone,
        });
      }).not.toThrow();
    });

    test("should accept valid wildcard domain with hosted zone", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "*.example.com",
          hostedZone,
        });
      }).not.toThrow();
    });

    test("should accept valid wildcard subdomain with hosted zone", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "*.api.example.com",
          hostedZone,
        });
      }).not.toThrow();
    });

    test("should reject domain with invalid characters", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api_example.com",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should reject domain with invalid characters when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api_example.com",
          hostedZone,
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain starting with hyphen", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "-api.example.com",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should reject domain starting with hyphen when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "-api.example.com",
          hostedZone,
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain ending with hyphen", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api-.example.com",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should reject domain ending with hyphen when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api-.example.com",
          hostedZone,
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain with consecutive dots", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api..example.com",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should reject domain with consecutive dots when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api..example.com",
          hostedZone,
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain with single character TLD", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.c",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should reject domain with single character TLD when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.c",
          hostedZone,
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain starting with dot", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: ".api.example.com",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should reject domain starting with dot when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: ".api.example.com",
          hostedZone,
        });
      }).toThrow(/Invalid domain format/);
    });

    test("should reject domain ending with dot", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com.",
        });
      }).toThrow(/Hosted zone required.*Domain.*specified without hosted zone/);
    });

    test("should reject domain ending with dot when hosted zone is provided", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com.",
          hostedZone,
        });
      }).toThrow(/Invalid domain format/);
    });
  });

  describe("Secret Header Value Validation", () => {
    test("should throw descriptive error for empty secretHeaderValue", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", { httpApi, secretHeaderValue: "" });
      }).toThrow(/'secretHeaderValue' must be a non-empty string/);
    });

    test("should throw descriptive error for whitespace-only secretHeaderValue", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          secretHeaderValue: "   ",
        });
      }).toThrow(/'secretHeaderValue' must be a non-empty string/);
    });

    test("should throw descriptive error for secretHeaderValue containing control characters", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          secretHeaderValue: "secret\r\nX-Injected: yes",
        });
      }).toThrow(/not allowed in an HTTP header value/);
    });

    test("should not include the secret value in the control character error message", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          secretHeaderValue: "supersecret\nvalue",
        });
      }).toThrow(expect.not.stringContaining("supersecret"));
    });

    test("should throw descriptive error for secretHeaderValue exceeding the CloudFront limit", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          secretHeaderValue: "a".repeat(1784),
        });
      }).toThrow(/exceeds the CloudFront limit/);
    });

    test("should accept a secretHeaderValue at the CloudFront limit", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          secretHeaderValue: "a".repeat(1783),
        });
      }).not.toThrow();
    });

    test("should not validate the content of unresolved tokens", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          secretHeaderValue:
            SecretValue.secretsManager("prod/api/x").unsafeUnwrap(),
        });
      }).not.toThrow();
    });

    test("should validate hosted zone and domain before secretHeaderValue", () => {
      expect(() => {
        new WafHttpApi(stack, "TestWafApi", {
          httpApi,
          domain: "api.example.com",
          secretHeaderValue: "",
        });
      }).toThrow(/Hosted zone required/);
    });
  });

  describe("Secret Header Value Warnings", () => {
    test("should warn when the supplied secretHeaderValue is shorter than 16 characters", () => {
      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        secretHeaderValue: "short",
      });

      Annotations.fromStack(stack).hasWarning(
        "*",
        Match.stringLikeRegexp("shorter than 16 characters"),
      );
    });

    test("should not warn for a secretHeaderValue of 16 characters or more", () => {
      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        secretHeaderValue: "abcdefghijklmnop",
      });

      Annotations.fromStack(stack).hasNoWarning(
        "*",
        Match.stringLikeRegexp("shorter than 16 characters"),
      );
    });

    test("should not warn for an unresolved token", () => {
      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        secretHeaderValue:
          SecretValue.secretsManager("prod/api/x").unsafeUnwrap(),
      });

      Annotations.fromStack(stack).hasNoWarning(
        "*",
        Match.stringLikeRegexp("shorter than 16 characters"),
      );
    });

    test("should not warn in the default managed mode", () => {
      new WafHttpApi(stack, "TestWafApi", { httpApi });

      Annotations.fromStack(stack).hasNoWarning("*", Match.anyValue());
    });
  });
});
