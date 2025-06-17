import * as crypto from "crypto";
import { Fn } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

/**
 * @interface WafHttpApiProps
 * @description Properties for the `WafForHttpApi` construct.
 */
export interface WafHttpApiProps {
  /**
   * The HTTP API to be protected by the WAF and CloudFront.
   * This should be an instance of `aws-cdk-lib/aws-apigatewayv2.HttpApi`.
   * @type {HttpApi}
   */
  readonly httpApi: HttpApi;
  /**
   * Optional: Custom WAF rules to apply to the WebACL.
   * If not provided, a default set of AWS Managed Rules will be used,
   * specifically "AWSManagedRulesAmazonIpReputationList" and "AWSManagedRulesCommonRuleSet".
   * These rules help protect against common web exploits and unwanted traffic.
   * @type {wafv2.CfnWebACL.RuleProperty[]}
   * @default AWS Managed Rules (AmazonIpReputationList, CommonRuleSet)
   */
  readonly wafRules?: wafv2.CfnWebACL.RuleProperty[];
}

/**
 * @class WafHttpApi
 * @extends Construct
 * @description A CDK construct that fronts an AWS HTTP API with a CloudFront distribution
 * and protects it with AWS WAF. This enhances security and performance by
 * adding a global CDN layer and web application firewall capabilities.
 * It also injects a secret header from CloudFront to the origin to allow
 * for origin verification by a Lambda Authorizer or similar mechanism.
 */
export class WafHttpApi extends Construct {
  /**
   * @static
   * @readonly
   * @property {string} SECRET_HEADER_NAME
   * @description The name of the custom header CloudFront will add to requests
   * forwarded to the origin. This header can be used by your backend (e.g.,
   * a Lambda Authorizer for API Gateway) to verify that the request originated
   * from CloudFront and not directly from the internet.
   */
  public static readonly SECRET_HEADER_NAME = "X-Origin-Verify";

  /**
   * @readonly
   * @property {cloudfront.Distribution} distribution
   * @description The CloudFront distribution created and managed by this construct.
   * You can use this property to retrieve the distribution's domain name or ARN.
   */
  public readonly distribution: cloudfront.Distribution;

  /**
   * @readonly
   * @property {string} secretHeaderValue
   * @description The randomly generated secret value for the custom header.
   * This value is unique for each deployment of the construct.
   * It should be used in your HTTP API's authorizer or backend logic
   * to validate requests coming through CloudFront.
   */
  public readonly secretHeaderValue: string;

  /**
   * @constructor
   * @param {Construct} scope The scope in which to define this construct (e.g., a CDK Stack).
   * @param {string} id The unique identifier for this construct within its scope.
   * @param {WafHttpApiProps} props The properties required to configure this construct,
   * including the target HTTP API and optional WAF rules.
   */
  constructor(scope: Construct, id: string, props: WafHttpApiProps) {
    super(scope, id);

    /**
     * @example
     * // Example usage within a CDK Stack:
     * import { Stack, StackProps } from 'aws-cdk-lib';
     * import { HttpApi, HttpMethod, HttpIntegration } from 'aws-cdk-lib/aws-apigatewayv2';
     * import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
     * import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
     * import { Runtime } from 'aws-cdk-lib/aws-lambda';
     * import { WafHttpApi } from './waf-http-api'; // Assuming your construct is in this path
     *
     * // Define a simple Lambda function to integrate with the API Gateway
     * const myLambda = new NodejsFunction(this, 'MyApiHandler', {
     * runtime: Runtime.NODEJS_18_X,
     * handler: 'handler',
     * entry: 'path/to/your/lambda/code.ts', // Specify the path to your Lambda function code
     * });
     *
     * // Create an HTTP API Gateway
     * const httpApi = new HttpApi(this, 'MyHttpApi', {
     * description: 'My example HTTP API',
     * });
     *
     * // Add a route to the HTTP API that integrates with the Lambda function
     * httpApi.addRoutes({
     * path: '/hello',
     * methods: [HttpMethod.GET],
     * integration: new HttpLambdaIntegration('MyLambdaIntegration', myLambda),
     * });
     *
     * // Instantiate the WafHttpApi construct to protect the HTTP API
     * const protectedApi = new WafHttpApi(this, 'ProtectedMyApi', {
     * httpApi: httpApi,
     * // Optionally, provide custom WAF rules:
     * // wafRules: [
     * //   {
     * //     name: 'MyCustomIpBlockRule',
     * //     priority: 10,
     * //     statement: {
     * //       ipSetReferenceStatement: { arn: 'arn:aws:wafv2:...' }
     * //     },
     * //     action: { block: {} },
     * //     visibilityConfig: {
     * //       cloudWatchMetricsEnabled: true,
     * //       metricName: 'MyCustomIpBlock',
     * //       sampledRequestsEnabled: true,
     * //     },
     * //   },
     * // ],
     * });
     *
     * // Output the CloudFront URL of the protected API
     * new cdk.CfnOutput(this, 'ProtectedApiEndpoint', {
     * value: protectedApi.distribution.distributionDomainName,
     * description: 'The CloudFront URL for the protected API endpoint',
     * });
     *
     * // Output the secret header value for use in a Lambda authorizer if needed
     * new cdk.CfnOutput(this, 'OriginVerificationSecret', {
     * value: protectedApi.secretHeaderValue,
     * description: 'Secret value to verify CloudFront origin requests',
     * });
     */

    // Generate a cryptographically strong random hex string for the secret header value.
    // This ensures that the secret is unique and difficult to guess, enhancing security
    // when used for origin verification.
    this.secretHeaderValue = crypto.randomBytes(16).toString("hex");

    // Determine which WAF rules to apply. If custom rules are provided via props, use them.
    // Otherwise, fall back to the default managed rules defined in `createDefaultRules()`.
    const rules = props.wafRules ?? this.createDefaultRules();

    // 1. Create the AWS WAF WebACL (Web Access Control List)
    // This WebACL will be associated with the CloudFront distribution to filter web traffic.
    const webAcl = new wafv2.CfnWebACL(this, id + "WebAcl", {
      // Default action for requests that don't match any rules. 'allow' means they pass through.
      defaultAction: { allow: {} },
      // The scope MUST be 'CLOUDFRONT' for a WebACL to be associated with a CloudFront distribution.
      scope: "CLOUDFRONT",
      // Configuration for CloudWatch metrics and sampled requests, useful for monitoring WAF activity.
      visibilityConfig: {
        cloudWatchMetricsEnabled: true, // Enable metrics to view WAF performance in CloudWatch.
        metricName: `${id}-Waf`, // Unique metric name for this WebACL.
        sampledRequestsEnabled: true, // Enable sampling of requests for debugging and analysis.
      },
      // The array of rules that define how to inspect and handle web requests.
      rules: rules,
    });

    // 2. Create the CloudFront distribution
    // This distribution acts as the public-facing endpoint for the HTTP API,
    // providing CDN benefits like caching and reduced latency, and integrating with WAF.
    this.distribution = new cloudfront.Distribution(
      this,
      id + "ApiDistribution",
      {
        comment: `CloudFront distribution for HTTP API: ${props.httpApi.httpApiId}`, // Descriptive comment for the distribution.
        // Associate the created WAF WebACL with this CloudFront distribution.
        webAclId: webAcl.attrArn,
        // Enforce a minimum TLS security policy for connections between viewers and CloudFront.
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        // Define the default behavior for requests hitting this distribution.
        defaultBehavior: {
          // Configure the origin (backend server) for the distribution.
          // `Fn.select(2, Fn.split("/", props.httpApi.url!))` extracts the domain name
          // from the HTTP API's URL (e.g., "abcdef.execute-api.us-east-1.amazonaws.com").
          origin: new origins.HttpOrigin(
            Fn.select(2, Fn.split("/", props.httpApi.url!)),
            {
              // Enforce HTTPS-only communication between CloudFront and the origin.
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
              // Add the custom secret header to every request CloudFront forwards to the origin.
              // This is crucial for origin verification.
              customHeaders: {
                [WafHttpApi.SECRET_HEADER_NAME]: this.secretHeaderValue,
              },
            },
          ),
          // Redirect all HTTP viewer requests to HTTPS to ensure secure communication.
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          // Allow all HTTP methods (GET, POST, PUT, DELETE, etc.) to be forwarded to the origin.
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          // Disable caching for API requests by default, as API responses are typically dynamic
          // and should not be cached by the CDN.
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          // Forward all viewer headers, query strings, and cookies to the origin,
          // EXCEPT for the 'Host' header. The 'Host' header needs to be the API Gateway's
          // host to ensure correct routing within API Gateway.
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    );
  }

  /**
   * @private
   * @method createDefaultRules
   * @description Creates a default set of AWS Managed Rules for the WAF WebACL.
   * These rules provide a good baseline of protection against common threats.
   * @returns {wafv2.CfnWebACL.RuleProperty[]} An array of WAF rule properties.
   */
  private createDefaultRules(): wafv2.CfnWebACL.RuleProperty[] {
    return [
      {
        name: "AWS-AWSManagedRulesAmazonIpReputationList",
        priority: 1, // Rules are evaluated in order of priority (lower number first).
        statement: {
          // Specifies a managed rule group provided by AWS.
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesAmazonIpReputationList", // This rule group blocks known malicious IP addresses.
          },
        },
        // The `none` action means the rule group's default action (usually 'block') will apply.
        overrideAction: { none: {} },
        // Configuration for CloudWatch metrics and sampled requests for this specific rule.
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: "awsManagedRulesAmazonIpReputationList",
          sampledRequestsEnabled: true,
        },
      },
      {
        name: "AWS-AWSManagedRulesCommonRuleSet",
        priority: 2,
        statement: {
          managedRuleGroupStatement: {
            vendorName: "AWS",
            name: "AWSManagedRulesCommonRuleSet", // This rule group protects against a broad range of common web exploits.
          },
        },
        overrideAction: { none: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: "awsManagedRulesCommonRuleSet",
          sampledRequestsEnabled: true,
        },
      },
    ];
  }
}
