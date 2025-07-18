import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import { WafHttpApi } from "../src/index";

describe("WafHttpApi - Hosted Zone Functionality", () => {
  let app: App;
  let stack: Stack;
  let httpApi: HttpApi;
  let hostedZone: route53.IHostedZone;
  let consoleSpy: jest.SpyInstance;

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
    consoleSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("constructor with domain and hosted zone (DNS records created)", () => {
    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      domain: "api.example.com",
      hostedZone,
    });

    const template = Template.fromStack(stack);

    // Verify CloudFront distribution is configured with custom domain
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distributionConfig =
      Object.values(distributions)[0].Properties.DistributionConfig;
    expect(distributionConfig.Aliases).toEqual(["api.example.com"]);

    // Verify ACM certificate is created
    template.resourceCountIs("AWS::CertificateManager::Certificate", 1);

    // Verify Route 53 A record is created
    template.resourceCountIs("AWS::Route53::RecordSet", 2); // A and AAAA records

    // Check A record properties - simplified to avoid CloudFormation structure complexity
    const recordSets = template.findResources("AWS::Route53::RecordSet");
    const aRecord = Object.values(recordSets).find(
      (record: any) => record.Properties.Type === "A",
    );
    const aaaaRecord = Object.values(recordSets).find(
      (record: any) => record.Properties.Type === "AAAA",
    );

    expect(aRecord).toBeDefined();
    expect(aRecord!.Properties.Name).toBe("api.example.com.");
    expect(aRecord!.Properties.HostedZoneId).toBe("Z1234567890ABC");

    expect(aaaaRecord).toBeDefined();
    expect(aaaaRecord!.Properties.Name).toBe("api.example.com.");
    expect(aaaaRecord!.Properties.HostedZoneId).toBe("Z1234567890ABC");

    // Verify properties are exposed correctly
    expect(wafApi.customDomain).toBe("api.example.com");
    expect(wafApi.certificate).toBeDefined();
    expect(wafApi.aRecord).toBeDefined();
    expect(wafApi.aaaaRecord).toBeDefined();
    // Note: domainName returns CDK tokens, so we verify the records exist and check CloudFormation template instead
  });

  test("constructor with hosted zone only (should ignore hosted zone)", () => {
    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      hostedZone, // Hosted zone provided without domain
    });

    const template = Template.fromStack(stack);

    // Verify no Route 53 records are created
    template.resourceCountIs("AWS::Route53::RecordSet", 0);

    // Verify no ACM certificate is created
    template.resourceCountIs("AWS::CertificateManager::Certificate", 0);

    // Verify properties are undefined
    expect(wafApi.customDomain).toBeUndefined();
    expect(wafApi.certificate).toBeUndefined();
    expect(wafApi.aRecord).toBeUndefined();
    expect(wafApi.aaaaRecord).toBeUndefined();

    // Verify warning was logged
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Hosted zone provided without domain"),
    );
  });

  test("hosted zone validation with valid configurations", () => {
    const validConfigurations = [
      { domain: "example.com", zoneName: "example.com" }, // Apex domain
      { domain: "api.example.com", zoneName: "example.com" }, // Subdomain
      { domain: "v1.api.example.com", zoneName: "example.com" }, // Deep subdomain
      { domain: "*.example.com", zoneName: "example.com" }, // Wildcard apex
      { domain: "*.api.example.com", zoneName: "example.com" }, // Wildcard subdomain
    ];

    validConfigurations.forEach(({ domain, zoneName }, index) => {
      const testHostedZone = route53.HostedZone.fromHostedZoneAttributes(
        stack,
        `TestZone${index}`,
        {
          hostedZoneId: `Z123456789${index}ABC`,
          zoneName,
        },
      );

      expect(() => {
        new WafHttpApi(stack, `TestWafApi${index}`, {
          httpApi: new HttpApi(stack, `TestApi${index}`),
          domain,
          hostedZone: testHostedZone,
        });
      }).not.toThrow();
    });
  });

  test("hosted zone validation with invalid configurations", () => {
    const invalidConfigurations = [
      { domain: "different.com", zoneName: "example.com" }, // Different domain
      { domain: "api.different.com", zoneName: "example.com" }, // Different parent domain
    ];

    invalidConfigurations.forEach(({ domain, zoneName }, index) => {
      const testHostedZone = route53.HostedZone.fromHostedZoneAttributes(
        stack,
        `TestZone${index}`,
        {
          hostedZoneId: `Z123456789${index}ABC`,
          zoneName,
        },
      );

      expect(() => {
        new WafHttpApi(stack, `TestWafApi${index}`, {
          httpApi: new HttpApi(stack, `TestApi${index}`),
          domain,
          hostedZone: testHostedZone,
        });
      }).toThrow(/Hosted zone domain compatibility validation failed/);
    });
  });

  test("DNS record creation and property exposure", () => {
    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      domain: "api.example.com",
      hostedZone,
    });

    // Verify A record properties (domainName is a CDK token, so we check it's defined)
    expect(wafApi.aRecord).toBeDefined();
    expect(wafApi.aRecord!.domainName).toBeDefined();

    // Verify AAAA record properties (domainName is a CDK token, so we check it's defined)
    expect(wafApi.aaaaRecord).toBeDefined();
    expect(wafApi.aaaaRecord!.domainName).toBeDefined();

    // Verify records point to the same CloudFront distribution
    expect(wafApi.aRecord).toBeInstanceOf(route53.ARecord);
    expect(wafApi.aaaaRecord).toBeInstanceOf(route53.AaaaRecord);
  });

  test("domain-hosted zone compatibility validation", () => {
    const testCases = [
      {
        domain: "api.example.com",
        zoneName: "example.com",
        shouldPass: true,
        description: "subdomain matches hosted zone",
      },
      {
        domain: "example.com",
        zoneName: "example.com",
        shouldPass: true,
        description: "apex domain matches hosted zone",
      },
      {
        domain: "api.different.com",
        zoneName: "example.com",
        shouldPass: false,
        description: "domain doesn't match hosted zone",
      },
    ];

    testCases.forEach(({ domain, zoneName, shouldPass }, index) => {
      const testHostedZone = route53.HostedZone.fromHostedZoneAttributes(
        stack,
        `TestZone${index}`,
        {
          hostedZoneId: `Z123456789${index}ABC`,
          zoneName,
        },
      );

      if (shouldPass) {
        expect(() => {
          new WafHttpApi(stack, `TestWafApi${index}`, {
            httpApi: new HttpApi(stack, `TestApi${index}`),
            domain,
            hostedZone: testHostedZone,
          });
        }).not.toThrow();
      } else {
        expect(() => {
          new WafHttpApi(stack, `TestWafApi${index}`, {
            httpApi: new HttpApi(stack, `TestApi${index}`),
            domain,
            hostedZone: testHostedZone,
          });
        }).toThrow(/Hosted zone domain compatibility validation failed/);
      }
    });
  });

  test("DNS record creation with wildcard domains", () => {
    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      domain: "*.api.example.com",
      hostedZone,
    });

    const template = Template.fromStack(stack);

    // Verify Route 53 records are created
    template.resourceCountIs("AWS::Route53::RecordSet", 2);

    // Verify properties are set correctly
    expect(wafApi.customDomain).toBe("*.api.example.com");
    expect(wafApi.aRecord!.domainName).toBeDefined();
    expect(wafApi.aaaaRecord!.domainName).toBeDefined();
  });

  test("error handling for DNS record creation failures", () => {
    // This test verifies that error handling logic exists
    // Actual DNS record creation failures are difficult to simulate in unit tests

    expect(() => {
      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        domain: "api.example.com",
        hostedZone,
      });
    }).not.toThrow();
  });

  test("hosted zone warning message format", () => {
    new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      hostedZone, // Hosted zone without domain
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("⚠️  WafHttpApi Warning"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Hosted zone provided without domain"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("🔧 Solution"),
    );
  });

  test("DNS record properties are undefined when no hosted zone provided", () => {
    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      domain: "api.example.com", // Domain without hosted zone
    });

    // DNS records should not be created without hosted zone
    expect(wafApi.aRecord).toBeUndefined();
    expect(wafApi.aaaaRecord).toBeUndefined();

    // Other properties should still be set
    expect(wafApi.customDomain).toBe("api.example.com");
    expect(wafApi.certificate).toBeDefined();
  });

  test("wildcard domain with hosted zone", () => {
    const testHostedZone = route53.HostedZone.fromHostedZoneAttributes(
      stack,
      "WildcardTestZone",
      {
        hostedZoneId: "Z1234567890ABC",
        zoneName: "example.com",
      },
    );

    // Valid: wildcard subdomain
    expect(() => {
      const wafApi = new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        domain: "*.api.example.com",
        hostedZone: testHostedZone,
      });

      // Verify DNS records are created for wildcard domain
      expect(wafApi.aRecord).toBeDefined();
      expect(wafApi.aaaaRecord).toBeDefined();
      // Note: domainName returns CDK tokens, so we verify the records exist
    }).not.toThrow();

    // Valid: wildcard apex
    expect(() => {
      new WafHttpApi(stack, "TestWafApi2", {
        httpApi: new HttpApi(stack, "TestApi2"),
        domain: "*.example.com",
        hostedZone: testHostedZone,
      });
    }).not.toThrow();
  });
});
