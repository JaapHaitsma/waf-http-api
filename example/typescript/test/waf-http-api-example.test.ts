import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { WafHttpApiExampleStack } from "../lib/waf-http-api-example-stack";

describe("WafHttpApiExampleStack", () => {
  let app: cdk.App;
  let stack: WafHttpApiExampleStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new WafHttpApiExampleStack(app, "TestStack");
    template = Template.fromStack(stack);
  });

  test("creates Lambda function with Node.js 22 runtime", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
      Handler: "index.handler",
    });
  });

  test("creates HTTP API Gateway", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      ProtocolType: "HTTP",
      Name: "waf-http-api-example",
      Description: "Example HTTP API protected by WAF and CloudFront",
    });
  });

  test("creates API Gateway routes", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /",
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /hello",
    });

    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /hello",
    });
  });

  test("creates CloudFront distribution", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Enabled: true,
        DefaultCacheBehavior: Match.objectLike({
          ViewerProtocolPolicy: "redirect-to-https",
        }),
      }),
    });
  });

  test("creates WAF WebACL with CloudFront scope", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Scope: "CLOUDFRONT",
      DefaultAction: {
        Allow: {},
      },
    });
  });

  test("creates Lambda integration", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Integration", {
      IntegrationType: "AWS_PROXY",
      PayloadFormatVersion: "2.0",
    });
  });

  test("outputs are created", () => {
    template.hasOutput("HttpApiUrl", {});
    template.hasOutput("CloudFrontUrl", {});
    template.hasOutput("CloudFrontDistributionId", {});
    template.hasOutput("SecretHeaderName", {});
    template.hasOutput("SecretHeaderValue", {});
  });

  test("Lambda has environment variable for CloudFront secret", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: Match.objectLike({
          CLOUDFRONT_SECRET: Match.anyValue(),
        }),
      },
    });
  });
});
