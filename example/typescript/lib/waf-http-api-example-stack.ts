import * as cdk from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { WafHttpApi } from "waf-http-api";

export class WafHttpApiExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a simple Lambda function that returns a greeting
    const helloLambda = new Function(this, "HelloLambda", {
      runtime: Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Event:', JSON.stringify(event, null, 2));
          
          // Check for the CloudFront secret header for origin verification
          const secretHeader = event.headers['x-origin-verify'];
          const expectedSecret = process.env.CLOUDFRONT_SECRET;
          
          if (secretHeader && expectedSecret && secretHeader === expectedSecret) {
            console.log('✅ Request verified as coming from CloudFront');
          } else {
            console.log('⚠️  Request may not be from CloudFront (missing or invalid secret header)');
          }
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: JSON.stringify({
              message: 'Hello from waf-http-sdk CDK construct!!',
              timestamp: new Date().toISOString(),
              requestId: event.requestContext?.requestId,
              sourceIp: event.requestContext?.http?.sourceIp,
              userAgent: event.headers['user-agent'],
              cloudFrontVerified: secretHeader === expectedSecret
            }, null, 2)
          };
        };
      `),
    });

    // Create the HTTP API Gateway
    const httpApi = new HttpApi(this, "ExampleHttpApi", {
      description: "Example HTTP API protected by WAF and CloudFront",
      apiName: "waf-http-api-example",
    });

    // Create Lambda integration
    const lambdaIntegration = new HttpLambdaIntegration(
      "HelloLambdaIntegration",
      helloLambda,
    );

    // Add routes to the HTTP API
    httpApi.addRoutes({
      path: "/",
      methods: [HttpMethod.GET],
      integration: lambdaIntegration,
    });

    httpApi.addRoutes({
      path: "/hello",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: lambdaIntegration,
    });

    // Create the WAF-protected HTTP API using our construct
    const protectedApi = new WafHttpApi(this, "ProtectedApi", {
      httpApi: httpApi,
      // You can uncomment and configure these for custom domain support:
      // domain: 'api.example.com',
      // hostedZone: HostedZone.fromLookup(this, 'MyZone', {
      //   domainName: 'example.com'
      // }),
      //
      // You can also add custom WAF rules:
      // wafRules: [
      //   {
      //     name: 'RateLimitRule',
      //     priority: 10,
      //     statement: {
      //       rateBasedStatement: {
      //         limit: 2000,
      //         aggregateKeyType: 'IP',
      //       },
      //     },
      //     action: { block: {} },
      //     visibilityConfig: {
      //       cloudWatchMetricsEnabled: true,
      //       metricName: 'RateLimitRule',
      //       sampledRequestsEnabled: true,
      //     },
      //   },
      // ],
    });

    // Set the CloudFront secret as an environment variable for the Lambda
    helloLambda.addEnvironment(
      "CLOUDFRONT_SECRET",
      protectedApi.secretHeaderValue,
    );

    // Output the important endpoints and information
    new cdk.CfnOutput(this, "HttpApiUrl", {
      value: httpApi.url!,
      description: "Direct HTTP API URL (not recommended for production use!!)",
    });

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${protectedApi.distribution.distributionDomainName}`,
      description: "CloudFront distribution URL (recommended endpoint)",
    });

    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: protectedApi.distribution.distributionId,
      description: "CloudFront distribution ID",
    });

    new cdk.CfnOutput(this, "SecretHeaderName", {
      value: WafHttpApi.SECRET_HEADER_NAME,
      description: "Name of the secret header added by CloudFront",
    });

    new cdk.CfnOutput(this, "SecretHeaderValue", {
      value: protectedApi.secretHeaderValue,
      description: "Value of the secret header (for origin verification)",
    });

    // If custom domain is configured, output it
    if (protectedApi.customDomain) {
      new cdk.CfnOutput(this, "CustomDomainUrl", {
        value: `https://${protectedApi.customDomain}`,
        description: "Custom domain URL",
      });
    }
  }
}
