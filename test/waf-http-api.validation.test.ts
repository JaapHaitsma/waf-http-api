import { App, Stack } from "aws-cdk-lib";
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
});
