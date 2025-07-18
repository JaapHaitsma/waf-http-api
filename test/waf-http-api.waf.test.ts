import { App, Stack } from "aws-cdk-lib";
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
});
