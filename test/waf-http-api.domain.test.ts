import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { WafHttpApi } from "../src/index";

describe("WafHttpApi - Domain Configuration", () => {
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
    // Suppress console warnings for cleaner test output (warnings are tested separately)
    consoleSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("CloudFront distribution without custom domain", () => {
    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
    });

    const template = Template.fromStack(stack);

    // Verify distribution exists
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    // Verify no Aliases property is set (undefined properties are omitted from CloudFormation)
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distributionConfig =
      Object.values(distributions)[0].Properties.DistributionConfig;
    expect(distributionConfig.Aliases).toBeUndefined();
    expect(distributionConfig.ViewerCertificate).toBeUndefined();

    // Verify properties are undefined when not applicable
    expect(wafApi.customDomain).toBeUndefined();
    expect(wafApi.certificate).toBeUndefined();
  });

  test("CloudFront distribution with custom domain only (auto-certificate)", () => {
    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      domain: "api.example.com",
      hostedZone,
    });

    const template = Template.fromStack(stack);

    // Verify distribution exists with custom domain
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    // Verify domain aliases are configured
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distributionConfig =
      Object.values(distributions)[0].Properties.DistributionConfig;
    expect(distributionConfig.Aliases).toEqual(["api.example.com"]);

    // Verify ACM certificate is created
    template.resourceCountIs("AWS::CertificateManager::Certificate", 1);

    // Verify properties are exposed correctly
    expect(wafApi.customDomain).toBe("api.example.com");
    expect(wafApi.certificate).toBeDefined();
  });

  test("CloudFront distribution with custom domain and provided certificate", () => {
    const certificate = acm.Certificate.fromCertificateArn(
      stack,
      "TestCert",
      "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
    );

    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      domain: "api.example.com",
      hostedZone,
      certificate,
    });

    const template = Template.fromStack(stack);

    // Verify distribution exists with custom domain
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    // Verify domain aliases are configured
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distributionConfig =
      Object.values(distributions)[0].Properties.DistributionConfig;
    expect(distributionConfig.Aliases).toEqual(["api.example.com"]);

    // Verify no new ACM certificate is created (using provided one)
    template.resourceCountIs("AWS::CertificateManager::Certificate", 0);

    // Verify properties are exposed correctly
    expect(wafApi.customDomain).toBe("api.example.com");
    expect(wafApi.certificate).toBe(certificate);
  });

  test("CloudFront distribution with certificate only (should ignore certificate)", () => {
    const certificate = acm.Certificate.fromCertificateArn(
      stack,
      "TestCert",
      "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
    );

    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      certificate, // Certificate provided without domain
    });

    const template = Template.fromStack(stack);

    // Verify distribution exists without custom domain
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    // Verify no domain aliases are configured
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distributionConfig =
      Object.values(distributions)[0].Properties.DistributionConfig;
    expect(distributionConfig.Aliases).toBeUndefined();

    // Verify properties are undefined when certificate is ignored
    expect(wafApi.customDomain).toBeUndefined();
    expect(wafApi.certificate).toBeUndefined();
  });

  test("should expose customDomain property when domain is provided", () => {
    const wafApi = new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      domain: "api.example.com",
      hostedZone,
    });

    expect(wafApi.customDomain).toBe("api.example.com");
  });
});
