import { App, NestedStack, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { WafHttpApi } from "../src/index";

describe("WafHttpApi - WAF Configuration", () => {
  let app: App;
  let stack: Stack;
  let httpApi: HttpApi;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TestStack");
    httpApi = new HttpApi(stack, "TestApi");
  });

  test("should create WebACL with default managed rules", () => {
    new WafHttpApi(stack, "TestWafApi", {
      httpApi,
    });

    const template = Template.fromStack(stack);

    // Verify WebACL is created
    template.resourceCountIs("AWS::WAFv2::WebACL", 1);

    // Verify default rules are applied
    const webAcls = template.findResources("AWS::WAFv2::WebACL");
    const webAcl = Object.values(webAcls)[0];

    expect(webAcl.Properties.Rules).toHaveLength(2);
    expect(webAcl.Properties.Rules[0].Name).toBe(
      "AWS-AWSManagedRulesAmazonIpReputationList",
    );
    expect(webAcl.Properties.Rules[1].Name).toBe(
      "AWS-AWSManagedRulesCommonRuleSet",
    );
  });

  test("should create WebACL with custom rules when provided", () => {
    const customRules: wafv2.CfnWebACL.RuleProperty[] = [
      {
        name: "CustomRule1",
        priority: 10,
        statement: {
          rateBasedStatement: {
            limit: 2000,
            aggregateKeyType: "IP",
          },
        },
        action: { block: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: "CustomRule1",
          sampledRequestsEnabled: true,
        },
      },
    ];

    new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      wafRules: customRules,
    });

    const template = Template.fromStack(stack);

    // Verify WebACL is created
    template.resourceCountIs("AWS::WAFv2::WebACL", 1);

    // Verify custom rules are applied
    const webAcls = template.findResources("AWS::WAFv2::WebACL");
    const webAcl = Object.values(webAcls)[0];

    expect(webAcl.Properties.Rules).toHaveLength(1);
    expect(webAcl.Properties.Rules[0].Name).toBe("CustomRule1");
    expect(webAcl.Properties.Rules[0].Priority).toBe(10);
  });

  test("should associate WebACL with CloudFront distribution", () => {
    new WafHttpApi(stack, "TestWafApi", {
      httpApi,
    });

    const template = Template.fromStack(stack);

    // Verify both WebACL and Distribution exist
    template.resourceCountIs("AWS::WAFv2::WebACL", 1);
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    // Verify WebACL is associated with the distribution
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distribution = Object.values(distributions)[0];

    expect(distribution.Properties.DistributionConfig.WebACLId).toBeDefined();

    // The WebACL ID should reference the created WebACL
    const webAcls = template.findResources("AWS::WAFv2::WebACL");
    const webAclLogicalId = Object.keys(webAcls)[0];

    expect(distribution.Properties.DistributionConfig.WebACLId).toEqual({
      "Fn::GetAtt": [webAclLogicalId, "Arn"],
    });
  });

  describe("WebACL Naming", () => {
    const webAclOf = (s: Stack) =>
      Object.values(
        Template.fromStack(s).findResources("AWS::WAFv2::WebACL"),
      )[0].Properties;

    test("should name the WebACL after the stack", () => {
      // Left to CloudFormation the generated name is <logicalId>-<random>, with no stack name
      // in it, so the AWS WAF console cannot tell you which stack a WebACL belongs to.
      const wafApi = new WafHttpApi(stack, "ProtectedApi", { httpApi });

      expect(wafApi.webAclName).toBe("TestStack-ProtectedApi-WebACL");
      expect(webAclOf(stack).Name).toBe("TestStack-ProtectedApi-WebACL");
    });

    test("should use the same string as the CloudWatch metric name", () => {
      const wafApi = new WafHttpApi(stack, "ProtectedApi", { httpApi });

      expect(wafApi.webAclMetricName).toBe("TestStack-ProtectedApi-WebACL");
      expect(webAclOf(stack).VisibilityConfig.MetricName).toBe(
        webAclOf(stack).Name,
      );
    });

    test("should distinguish metrics for two stacks that reuse the same construct id", () => {
      const orders = new Stack(new App(), "OrdersStack");
      const ordersApi = new WafHttpApi(orders, "ProtectedApi", {
        httpApi: new HttpApi(orders, "Api"),
      });
      const billing = new Stack(new App(), "BillingStack");
      const billingApi = new WafHttpApi(billing, "ProtectedApi", {
        httpApi: new HttpApi(billing, "Api"),
      });

      expect(ordersApi.webAclMetricName).toBe(
        "OrdersStack-ProtectedApi-WebACL",
      );
      expect(billingApi.webAclMetricName).toBe(
        "BillingStack-ProtectedApi-WebACL",
      );
    });

    test("should distinguish metrics for two instances in the same stack", () => {
      const a = new WafHttpApi(stack, "ProtectedApi", { httpApi });
      const b = new WafHttpApi(stack, "AdminApi", {
        httpApi: new HttpApi(stack, "TestApi2"),
      });

      expect(a.webAclMetricName).toBe("TestStack-ProtectedApi-WebACL");
      expect(b.webAclMetricName).toBe("TestStack-AdminApi-WebACL");
    });

    test("should sanitize characters AWS WAF does not allow in the metric name", () => {
      const dotted = new Stack(new App(), "TestStack");
      const wafApi = new WafHttpApi(dotted, "orders.api", {
        httpApi: new HttpApi(dotted, "Api"),
      });

      expect(wafApi.webAclMetricName).toBe("TestStack-orders-api-WebACL");
      expect(wafApi.webAclMetricName).toMatch(/^[0-9A-Za-z_-]{1,128}$/);
    });

    test("should truncate long metric names to the 128 character limit with a stable hash", () => {
      const build = () => {
        const s = new Stack(new App(), "S".repeat(100));
        return new WafHttpApi(s, "P".repeat(60), {
          httpApi: new HttpApi(s, "Api"),
        }).webAclMetricName;
      };

      const name = build();
      expect(name).toHaveLength(128);
      expect(name).toMatch(/^[0-9A-Za-z_-]{1,128}$/);
      // Deterministic, so the synthesized template stays stable across synths.
      expect(build()).toBe(name);
    });

    test("should fall back when the stack name is an unresolved token", () => {
      const parent = new Stack(new App(), "ParentStack");
      const nested = new NestedStack(parent, "Nested");
      const wafApi = new WafHttpApi(nested, "ProtectedApi", {
        httpApi: new HttpApi(nested, "Api"),
      });

      // The stack name cannot be sanitized at synth time, so the metric name falls back to the id.
      expect(wafApi.webAclName).toBeUndefined();
      expect(wafApi.webAclMetricName).toBe("ProtectedApi-Waf");
      const template = Template.fromStack(nested as unknown as Stack);
      const props = webAclOf(nested as unknown as Stack);
      expect(props.Name).toBeUndefined();
      expect(props.VisibilityConfig.MetricName).toBe("ProtectedApi-Waf");

      // The secret and the distribution comment fall back too.
      const secret = Object.values(
        template.findResources("AWS::SecretsManager::Secret"),
      )[0];
      expect(secret.Properties.Name).toBeUndefined();
      const distribution = Object.values(
        template.findResources("AWS::CloudFront::Distribution"),
      )[0];
      expect(distribution.Properties.DistributionConfig.Comment).toBeDefined();
    });
  });
});
