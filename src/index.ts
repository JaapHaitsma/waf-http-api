import * as crypto from 'crypto';
import * as cdk from 'aws-cdk-lib';
import { Fn } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

/**
 * Properties for the WafForHttpApi construct.
 */
export interface WafHttpApiProps {
  /**
	 * The HTTP API to be protected by the WAF and CloudFront.
	 */
  readonly httpApi: HttpApi;
  /**
	 * Optional: Custom WAF rules to apply.
	 * If not provided, a default set of AWS Managed Rules will be used.
	 */
  readonly wafRules?: wafv2.CfnWebACL.RuleProperty[];
}

/**
 * A CDK construct that fronts an HTTP API with a CloudFront distribution
 * and protects it with AWS WAF.
 */
export class WafHttpApi extends Construct {
  /**
	 * The name of the custom header CloudFront will add. Use this in your Lambda Authorizer.
	 */
  public static readonly SECRET_HEADER_NAME = 'X-Origin-Verify';

  /**
	 * The CloudFront distribution created by the construct.
	 */
  public readonly distribution: cloudfront.Distribution;

  /**
	 * The generated secret value for the custom header.
	 * Use this value in your HTTP API's authorizer.
	 */
  public readonly secretHeaderValue: string;


  constructor(scope: Construct, id: string, props: WafHttpApiProps) {
    super(scope, id);

    // Generate the secret value internally
    this.secretHeaderValue = crypto.randomBytes(16).toString('hex');

    // Default rules if none are provided
    const rules = props.wafRules ?? this.createDefaultRules();

    // 1. Create the WAF WebACL for CloudFront
    const webAcl = new wafv2.CfnWebACL(this, id + 'WebAcl', {
      defaultAction: { allow: {} },
      // The scope must be CLOUDFRONT to be used with a CloudFront distribution.
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${id}-Waf`,
        sampledRequestsEnabled: true,
      },
      rules: rules,
    });

    // 2. Create the CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, id + 'ApiDistribution', {
      comment: `Distribution for ${props.httpApi.httpApiId}`,
      // Associate the WAF with the distribution
      webAclId: webAcl.attrArn,
      // Set the minimum security policy for the distribution
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      // Default behavior routes all requests to the HTTP API origin
      defaultBehavior: {
        // The origin is the HTTP API
        origin: new origins.HttpOrigin(Fn.select(2, Fn.split('/', props.httpApi.url!)), {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
          // Add the custom secret header to every request to the origin
          customHeaders: {
            [WafHttpApi.SECRET_HEADER_NAME]: this.secretHeaderValue,
          },
        }),
        // Ensure viewer requests are redirected to HTTPS
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // Allow all HTTP methods
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        // Disable caching by default for API requests
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        // Forward all headers, query strings, and cookies except the Host header
        // Host header needs to be API Gateway host to route the request correctly
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    });

    // 3. Output the CloudFront distribution's domain name
    new cdk.CfnOutput(this, 'ProtectedApiUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'The URL of the WAF-protected API endpoint.',
    });
  }

  /**
	 * Creates a default set of AWS Managed Rules for the WAF.
	 * @returns An array of CfnWebACL.RuleProperty
	 */
  private createDefaultRules(): wafv2.CfnWebACL.RuleProperty[] {
    return [
      {
        name: 'AWS-AWSManagedRulesAmazonIpReputationList',
        priority: 1,
        statement: {
          managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesAmazonIpReputationList',
          },
        },
        overrideAction: { none: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'awsManagedRulesAmazonIpReputationList',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWS-AWSManagedRulesCommonRuleSet',
        priority: 2,
        statement: {
          managedRuleGroupStatement: {
            vendorName: 'AWS',
            name: 'AWSManagedRulesCommonRuleSet',
          },
        },
        overrideAction: { none: {} },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'awsManagedRulesCommonRuleSet',
          sampledRequestsEnabled: true,
        },
      },
    ];
  }
}
