import * as crypto from "crypto";
import { Fn } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { Construct } from "constructs";

/**
 * @interface WafHttpApiProps
 * @description Properties for configuring the WafHttpApi construct.
 * This interface defines all the configuration options available when creating
 * a WAF-protected HTTP API with CloudFront distribution and optional custom domain support.
 */
export interface WafHttpApiProps {
  /**
   * The HTTP API to be protected by the WAF and CloudFront.
   * This should be an instance of `aws-cdk-lib/aws-apigatewayv2.HttpApi`.
   * The API will be fronted by a CloudFront distribution with WAF protection.
   *
   * @type {HttpApi}
   * @example
   * const httpApi = new HttpApi(this, 'MyApi', {
   *   description: 'My protected HTTP API'
   * });
   */
  readonly httpApi: HttpApi;

  /**
   * Optional: Custom WAF rules to apply to the WebACL.
   * If not provided, a default set of AWS Managed Rules will be used,
   * specifically "AWSManagedRulesAmazonIpReputationList" and "AWSManagedRulesCommonRuleSet".
   * These rules help protect against common web exploits and unwanted traffic.
   *
   * @type {wafv2.CfnWebACL.RuleProperty[]}
   * @default AWS Managed Rules (AmazonIpReputationList, CommonRuleSet)
   * @example
   * wafRules: [
   *   {
   *     name: 'RateLimitRule',
   *     priority: 10,
   *     statement: {
   *       rateBasedStatement: {
   *         limit: 2000,
   *         aggregateKeyType: 'IP',
   *       },
   *     },
   *     action: { block: {} },
   *     visibilityConfig: {
   *       cloudWatchMetricsEnabled: true,
   *       metricName: 'RateLimitRule',
   *       sampledRequestsEnabled: true,
   *     },
   *   },
   * ]
   */
  readonly wafRules?: wafv2.CfnWebACL.RuleProperty[];

  /**
   * Optional: Custom domain name for the CloudFront distribution.
   * When provided, the CloudFront distribution will be configured to accept requests on this domain.
   * If no certificate is provided, an ACM certificate will be automatically generated with DNS validation.
   *
   * Supports various domain formats:
   * - Apex domains: `example.com`
   * - Subdomains: `api.example.com`, `www.api.example.com`
   * - Wildcard domains: `*.example.com`
   *
   * @type {string}
   * @example
   * // Apex domain
   * domain: 'example.com'
   *
   * // Subdomain
   * domain: 'api.example.com'
   *
   * // Wildcard domain
   * domain: '*.api.example.com'
   */
  readonly domain?: string;

  /**
   * Optional: SSL certificate for the custom domain.
   * Must be an ACM certificate in the us-east-1 region for CloudFront compatibility.
   * If not provided and a domain is specified, a certificate will be automatically generated
   * using DNS validation.
   *
   * **Important Requirements:**
   * - Certificate must be in us-east-1 region (CloudFront requirement)
   * - Certificate must cover the specified domain (exact match or wildcard)
   * - Certificate must be valid and accessible
   *
   * @type {acm.ICertificate}
   * @example
   * // Using existing certificate
   * const existingCert = Certificate.fromCertificateArn(
   *   this,
   *   'ExistingCert',
   *   'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
   * );
   *
   * // In props
   * certificate: existingCert
   */
  readonly certificate?: acm.ICertificate;

  /**
   * Optional: Route 53 hosted zone for automatic DNS record creation.
   * When provided along with a domain, the construct will automatically create
   * Route 53 A and AAAA records pointing to the CloudFront distribution.
   *
   * **Behavior:**
   * - When both `hostedZone` and `domain` are provided: DNS records are automatically created
   * - When `hostedZone` is provided without `domain`: Hosted zone is ignored with warning
   * - When `domain` is provided without `hostedZone`: No DNS records are created
   * - Domain must match or be a subdomain of the hosted zone's domain
   *
   * @type {route53.IHostedZone}
   * @example
   * // Using existing hosted zone
   * const hostedZone = HostedZone.fromLookup(this, 'MyZone', {
   *   domainName: 'example.com'
   * });
   *
   * // In props with automatic DNS record creation
   * const protectedApi = new WafHttpApi(this, 'MyApi', {
   *   httpApi: myHttpApi,
   *   domain: 'api.example.com',
   *   hostedZone: hostedZone
   * });
   *
   * // Access created DNS records
   * if (protectedApi.aRecord) {
   *   new CfnOutput(this, 'ARecordName', {
   *     value: protectedApi.aRecord.domainName
   *   });
   * }
   */
  readonly hostedZone?: route53.IHostedZone;
}

/**
 * @class WafHttpApi
 * @extends Construct
 * @description A CDK construct that fronts an AWS HTTP API with a CloudFront distribution
 * and protects it with AWS WAF. This enhances security and performance by
 * adding a global CDN layer and web application firewall capabilities.
 * It also injects a secret header from CloudFront to the origin to allow
 * for origin verification by a Lambda Authorizer or similar mechanism.
 *
 * **Custom Domain Support:**
 * This construct supports custom domains with automatic SSL certificate management.
 * When a domain is provided, the CloudFront distribution will be configured to accept
 * requests on that domain. If no certificate is provided, an ACM certificate will be
 * automatically generated with DNS validation.
 *
 * @example
 * // Basic usage without custom domain
 * const protectedApi = new WafHttpApi(this, 'MyProtectedApi', {
 *   httpApi: myHttpApi,
 * });
 *
 * @example
 * // Usage with custom domain (automatic certificate generation)
 * const protectedApiWithDomain = new WafHttpApi(this, 'MyProtectedApi', {
 *   httpApi: myHttpApi,
 *   domain: 'api.example.com',
 * });
 *
 * @example
 * // Usage with custom domain and provided certificate
 * const protectedApiWithCert = new WafHttpApi(this, 'MyProtectedApi', {
 *   httpApi: myHttpApi,
 *   domain: 'api.example.com',
 *   certificate: existingCertificate,
 * });
 *
 * @example
 * // Usage with wildcard domain
 * const wildcardApi = new WafHttpApi(this, 'WildcardApi', {
 *   httpApi: myHttpApi,
 *   domain: '*.api.example.com',
 * });
 *
 * @example
 * // Usage with custom WAF rules and domain
 * const customRulesApi = new WafHttpApi(this, 'CustomRulesApi', {
 *   httpApi: myHttpApi,
 *   domain: 'secure-api.example.com',
 *   wafRules: [
 *     {
 *       name: 'RateLimitRule',
 *       priority: 10,
 *       statement: {
 *         rateBasedStatement: {
 *           limit: 2000,
 *           aggregateKeyType: 'IP',
 *         },
 *       },
 *       action: { block: {} },
 *       visibilityConfig: {
 *         cloudWatchMetricsEnabled: true,
 *         metricName: 'RateLimitRule',
 *         sampledRequestsEnabled: true,
 *       },
 *     },
 *   ],
 * });
 *
 * @example
 * // Usage with hosted zone for automatic DNS record creation
 * const hostedZone = HostedZone.fromLookup(this, 'MyZone', {
 *   domainName: 'example.com'
 * });
 *
 * const apiWithDns = new WafHttpApi(this, 'ApiWithDNS', {
 *   httpApi: myHttpApi,
 *   domain: 'api.example.com',
 *   hostedZone: hostedZone
 * });
 *
 * // Access the automatically created DNS records
 * if (apiWithDns.aRecord) {
 *   new CfnOutput(this, 'ARecordName', {
 *     value: apiWithDns.aRecord.domainName,
 *     description: 'A record for the API domain'
 *   });
 * }
 *
 * if (apiWithDns.aaaaRecord) {
 *   new CfnOutput(this, 'AAAARecordName', {
 *     value: apiWithDns.aaaaRecord.domainName,
 *     description: 'AAAA record for the API domain'
 *   });
 * }
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
   * The CloudFront distribution created and managed by this construct.
   * You can use this property to retrieve the distribution's domain name or ARN.
   *
   * @readonly
   * @type {cloudfront.Distribution}
   * @example
   * // Access the CloudFront distribution domain name
   * const distributionDomain = wafHttpApi.distribution.distributionDomainName;
   *
   * // Access the distribution ARN
   * const distributionArn = wafHttpApi.distribution.distributionArn;
   *
   * // Use in CloudFormation outputs
   * new CfnOutput(this, 'DistributionEndpoint', {
   *   value: `https://${wafHttpApi.distribution.distributionDomainName}`,
   *   description: 'CloudFront distribution endpoint'
   * });
   */
  public readonly distribution: cloudfront.Distribution;

  /**
   * The randomly generated secret value for the custom header.
   * This value is unique for each deployment of the construct and should be used
   * in your HTTP API's authorizer or backend logic to validate that requests
   * are coming through CloudFront and not directly from the internet.
   *
   * @readonly
   * @type {string}
   * @example
   * // Use in Lambda authorizer
   * export const handler = async (event: APIGatewayProxyEvent) => {
   *   const secretHeader = event.headers[WafHttpApi.SECRET_HEADER_NAME];
   *   const expectedSecret = process.env.CLOUDFRONT_SECRET; // Set from wafHttpApi.secretHeaderValue
   *
   *   if (secretHeader !== expectedSecret) {
   *     throw new Error('Unauthorized: Request not from CloudFront');
   *   }
   *
   *   // Continue with request processing...
   * };
   *
   * // Set as environment variable in Lambda
   * const lambda = new NodejsFunction(this, 'ApiHandler', {
   *   environment: {
   *     CLOUDFRONT_SECRET: wafHttpApi.secretHeaderValue
   *   }
   * });
   */
  public readonly secretHeaderValue: string;

  /**
   * The SSL certificate used for the custom domain.
   * This property will be defined in the following scenarios:
   * - When a certificate is provided via the `certificate` prop
   * - When a certificate is automatically generated for a custom domain
   *
   * The property will be `undefined` when no custom domain is configured.
   *
   * @readonly
   * @type {acm.ICertificate | undefined}
   * @example
   * // Check if certificate is available
   * if (wafHttpApi.certificate) {
   *   // Output certificate ARN
   *   new CfnOutput(this, 'CertificateArn', {
   *     value: wafHttpApi.certificate.certificateArn,
   *     description: 'SSL certificate ARN'
   *   });
   *
   *   // Use certificate in other resources
   *   const loadBalancer = new ApplicationLoadBalancer(this, 'ALB', {
   *     // ... other props
   *   });
   *
   *   loadBalancer.addListener('HttpsListener', {
   *     port: 443,
   *     certificates: [wafHttpApi.certificate],
   *     // ... other listener props
   *   });
   * }
   */
  public readonly certificate?: acm.ICertificate;

  /**
   * The custom domain name configured for this distribution.
   * This property will be defined when a domain is provided via the `domain` prop.
   * It will be `undefined` when no custom domain is configured.
   *
   * @readonly
   * @type {string | undefined}
   * @example
   * // Check if custom domain is configured
   * if (wafHttpApi.customDomain) {
   *   // Output custom domain endpoint
   *   new CfnOutput(this, 'CustomDomainEndpoint', {
   *     value: `https://${wafHttpApi.customDomain}`,
   *     description: 'Custom domain API endpoint'
   *   });
   *
   *   // Use domain in Route53 record
   *   new ARecord(this, 'ApiRecord', {
   *     zone: hostedZone,
   *     recordName: wafHttpApi.customDomain,
   *     target: RecordTarget.fromAlias(
   *       new CloudFrontTarget(wafHttpApi.distribution)
   *     ),
   *   });
   * } else {
   *   // Use CloudFront default domain
   *   new CfnOutput(this, 'DefaultEndpoint', {
   *     value: `https://${wafHttpApi.distribution.distributionDomainName}`,
   *     description: 'Default CloudFront endpoint'
   *   });
   * }
   */
  public readonly customDomain?: string;

  /**
   * The Route 53 A record created for the custom domain.
   * This property will be defined when both `hostedZone` and `domain` are provided,
   * and the construct automatically creates DNS records pointing to the CloudFront distribution.
   *
   * The A record maps the custom domain to the CloudFront distribution's IPv4 addresses.
   *
   * @readonly
   * @type {route53.ARecord | undefined}
   * @example
   * // Check if A record was created
   * if (wafHttpApi.aRecord) {
   *   // Output A record details
   *   new CfnOutput(this, 'ARecordName', {
   *     value: wafHttpApi.aRecord.domainName,
   *     description: 'A record domain name'
   *   });
   *
   *   // Reference the record in other resources
   *   const recordArn = wafHttpApi.aRecord.recordArn;
   * }
   *
   * // The A record will be undefined if:
   * // - No hostedZone was provided
   * // - No domain was provided
   * // - hostedZone was provided without domain (ignored with warning)
   */
  public readonly aRecord?: route53.ARecord;

  /**
   * The Route 53 AAAA record created for the custom domain.
   * This property will be defined when both `hostedZone` and `domain` are provided,
   * and the construct automatically creates DNS records pointing to the CloudFront distribution.
   *
   * The AAAA record maps the custom domain to the CloudFront distribution's IPv6 addresses.
   *
   * @readonly
   * @type {route53.AaaaRecord | undefined}
   * @example
   * // Check if AAAA record was created
   * if (wafHttpApi.aaaaRecord) {
   *   // Output AAAA record details
   *   new CfnOutput(this, 'AAAARecordName', {
   *     value: wafHttpApi.aaaaRecord.domainName,
   *     description: 'AAAA record domain name'
   *   });
   *
   *   // Reference the record in other resources
   *   const recordArn = wafHttpApi.aaaaRecord.recordArn;
   * }
   *
   * // The AAAA record will be undefined if:
   * // - No hostedZone was provided
   * // - No domain was provided
   * // - hostedZone was provided without domain (ignored with warning)
   */
  public readonly aaaaRecord?: route53.AaaaRecord;

  /**
   * @constructor
   * @param {Construct} scope The scope in which to define this construct (e.g., a CDK Stack).
   * @param {string} id The unique identifier for this construct within its scope.
   * @param {WafHttpApiProps} props The properties required to configure this construct,
   * including the target HTTP API, optional WAF rules, custom domain, and SSL certificate.
   *
   * **Props Configuration:**
   * - `httpApi` (required): The HTTP API Gateway to protect
   * - `wafRules` (optional): Custom WAF rules, defaults to AWS managed rules
   * - `domain` (optional): Custom domain name for the CloudFront distribution
   * - `certificate` (optional): SSL certificate for the custom domain (must be in us-east-1)
   *
   * **Custom Domain Behavior:**
   * - If `domain` is provided without `certificate`: ACM certificate is auto-generated
   * - If both `domain` and `certificate` are provided: Uses the provided certificate
   * - If `certificate` is provided without `domain`: Certificate is ignored with warning
   * - If neither is provided: Uses default CloudFront domain only
   */
  constructor(scope: Construct, id: string, props: WafHttpApiProps) {
    super(scope, id);

    /**
     * @example
     * // Complete usage examples within a CDK Stack:
     * import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
     * import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
     * import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
     * import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
     * import { Runtime } from 'aws-cdk-lib/aws-lambda';
     * import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
     * import { WafHttpApi } from './waf-http-api';
     *
     * // Define a Lambda function to integrate with the API Gateway
     * const myLambda = new NodejsFunction(this, 'MyApiHandler', {
     *   runtime: Runtime.NODEJS_18_X,
     *   handler: 'handler',
     *   entry: 'path/to/your/lambda/code.ts',
     * });
     *
     * // Create an HTTP API Gateway
     * const httpApi = new HttpApi(this, 'MyHttpApi', {
     *   description: 'My example HTTP API',
     * });
     *
     * // Add a route to the HTTP API
     * httpApi.addRoutes({
     *   path: '/hello',
     *   methods: [HttpMethod.GET],
     *   integration: new HttpLambdaIntegration('MyLambdaIntegration', myLambda),
     * });
     *
     * // Example 1: Basic usage without custom domain
     * const basicProtectedApi = new WafHttpApi(this, 'BasicProtectedApi', {
     *   httpApi: httpApi,
     * });
     *
     * // Example 2: With custom domain (automatic certificate generation)
     * const domainProtectedApi = new WafHttpApi(this, 'DomainProtectedApi', {
     *   httpApi: httpApi,
     *   domain: 'api.example.com',
     * });
     *
     * // Example 3: With custom domain and provided certificate
     * const existingCert = Certificate.fromCertificateArn(
     *   this,
     *   'ExistingCert',
     *   'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
     * );
     * const certProtectedApi = new WafHttpApi(this, 'CertProtectedApi', {
     *   httpApi: httpApi,
     *   domain: 'api.example.com',
     *   certificate: existingCert,
     * });
     *
     * // Example 4: With custom WAF rules and domain
     * const customRulesApi = new WafHttpApi(this, 'CustomRulesApi', {
     *   httpApi: httpApi,
     *   domain: 'secure-api.example.com',
     *   wafRules: [
     *     {
     *       name: 'MyCustomIpBlockRule',
     *       priority: 10,
     *       statement: {
     *         ipSetReferenceStatement: { arn: 'arn:aws:wafv2:us-east-1:123456789012:global/ipset/MyBlockedIPs/12345678-1234-1234-1234-123456789012' }
     *       },
     *       action: { block: {} },
     *       visibilityConfig: {
     *         cloudWatchMetricsEnabled: true,
     *         metricName: 'MyCustomIpBlock',
     *         sampledRequestsEnabled: true,
     *       },
     *     },
     *   ],
     * });
     *
     * // Output examples for different configurations
     * new CfnOutput(this, 'BasicApiEndpoint', {
     *   value: `https://${basicProtectedApi.distribution.distributionDomainName}`,
     *   description: 'Basic protected API endpoint (CloudFront domain)',
     * });
     *
     * new CfnOutput(this, 'CustomDomainEndpoint', {
     *   value: domainProtectedApi.customDomain ? `https://${domainProtectedApi.customDomain}` : 'No custom domain',
     *   description: 'Custom domain API endpoint',
     * });
     *
     * new CfnOutput(this, 'CertificateArn', {
     *   value: domainProtectedApi.certificate?.certificateArn || 'No certificate',
     *   description: 'SSL certificate ARN (auto-generated or provided)',
     * });
     *
     * new CfnOutput(this, 'OriginVerificationSecret', {
     *   value: domainProtectedApi.secretHeaderValue,
     *   description: 'Secret value for CloudFront origin verification',
     * });
     */

    // Handle domain and hosted zone validation first
    if (props.domain !== undefined) {
      // Domain provided - validate hosted zone is also provided
      if (!props.hostedZone) {
        throw new Error(
          `❌ Hosted zone required: Domain '${props.domain}' specified without hosted zone in WafHttpApi construct '${id}'.\n` +
            "📋 Issue: Custom domains require a hosted zone for DNS validation and automatic record creation.\n" +
            "🔧 Solution: Provide a hosted zone in your WafHttpApiProps:\n" +
            "   const hostedZone = HostedZone.fromLookup(this, 'MyZone', {\n" +
            "     domainName: 'example.com'\n" +
            "   });\n" +
            "   \n" +
            "   new WafHttpApi(this, 'MyApi', {\n" +
            "     httpApi: myHttpApi,\n" +
            `     domain: '${props.domain}',\n` +
            "     hostedZone: hostedZone  // Required for custom domains\n" +
            "   });\n" +
            "💡 Note: The domain must match or be a subdomain of the hosted zone's domain.\n" +
            "🔍 Examples:\n" +
            "   • Domain: 'api.example.com' → Hosted Zone: 'example.com' ✅\n" +
            "   • Domain: 'example.com' → Hosted Zone: 'example.com' ✅\n" +
            "   • Domain: '*.example.com' → Hosted Zone: 'example.com' ✅",
        );
      }

      // Now validate domain format
      this.validateDomainFormat(props.domain);
      this.customDomain = props.domain;
    } else {
      // No domain provided - ensure customDomain is undefined
      this.customDomain = undefined;
    }

    // Handle certificate logic with comprehensive error handling
    if (props.certificate) {
      try {
        // Validate provided certificate
        this.validateCertificateRegion(props.certificate);
        if (props.domain) {
          this.validateCertificateDomainCompatibility(
            props.certificate,
            props.domain,
          );
          this.certificate = props.certificate;
        } else {
          // Certificate provided without domain - log warning and ignore certificate
          console.warn(
            "⚠️  WafHttpApi Warning: Certificate provided without domain - certificate will be ignored.\n" +
              "   📋 Issue: A custom SSL certificate was provided but no domain was specified.\n" +
              "   🔧 Solution: Choose one of the following options:\n" +
              "      • Add a 'domain' property to your WafHttpApiProps to use the certificate\n" +
              "      • Remove the 'certificate' property if you don't need a custom domain\n" +
              "   💡 Example: { httpApi, domain: 'api.example.com', certificate: yourCertificate }",
          );
          this.certificate = undefined;
        }
      } catch (error) {
        // Re-throw certificate validation errors with enhanced context
        if (error instanceof Error) {
          throw new Error(
            `Certificate validation failed in WafHttpApi construct '${id}': ${error.message}\n` +
              "🔧 Troubleshooting steps:\n" +
              "   1. Verify your certificate exists and is accessible\n" +
              "   2. Ensure the certificate is in the us-east-1 region (required for CloudFront)\n" +
              "   3. Check that the certificate covers your specified domain\n" +
              "   4. Confirm you have the necessary permissions to access the certificate",
          );
        }
        throw error;
      }
    } else if (props.domain && props.domain.trim()) {
      // Auto-generate certificate with DNS validation using the provided hosted zone
      try {
        this.certificate = new acm.Certificate(this, "AutoGeneratedCert", {
          domainName: props.domain,
          validation: acm.CertificateValidation.fromDns(props.hostedZone),
          // Certificate must be created in us-east-1 region for CloudFront compatibility
          // This is handled automatically by CDK when the stack is in us-east-1,
          // or by using cross-region references when the stack is in a different region
        });
      } catch (error) {
        // Handle certificate generation failures with descriptive error messages
        if (error instanceof Error) {
          throw new Error(
            `Failed to create SSL certificate for domain '${props.domain}' in WafHttpApi construct '${id}': ${error.message}\n` +
              "🔧 Troubleshooting steps:\n" +
              "   1. Verify the domain name is valid and properly formatted\n" +
              "   2. Ensure you have permissions to create ACM certificates\n" +
              "   3. Check that the domain doesn't already have a certificate in ACM\n" +
              "   4. Verify your AWS account limits for ACM certificates haven't been exceeded\n" +
              "   5. Ensure the hosted zone is accessible and properly configured\n" +
              "   6. Consider providing your own certificate using the 'certificate' property\n" +
              "💡 Alternative: Provide an existing certificate: { httpApi, domain: '" +
              props.domain +
              "', certificate: existingCertificate, hostedZone: hostedZone }",
          );
        }
        throw error;
      }
    } else {
      // No domain and no certificate - ensure properties are undefined
      this.certificate = undefined;
    }

    // Handle hosted zone validation and DNS record setup
    if (props.hostedZone) {
      if (props.domain) {
        try {
          // Validate that the domain matches or is a subdomain of the hosted zone
          this.validateHostedZoneDomainCompatibility(
            props.hostedZone,
            props.domain,
          );
        } catch (error) {
          // Re-throw hosted zone validation errors with enhanced context
          if (error instanceof Error) {
            throw new Error(
              `Hosted zone validation failed in WafHttpApi construct '${id}': ${error.message}\n` +
                "🔧 Troubleshooting steps:\n" +
                "   1. Verify your hosted zone exists and is accessible\n" +
                "   2. Ensure the domain belongs to the hosted zone\n" +
                "   3. Check that you have the necessary permissions to access the hosted zone\n" +
                "   4. Confirm the hosted zone domain name is correctly configured",
            );
          }
          throw error;
        }
      } else {
        // Hosted zone provided without domain - log warning and ignore hosted zone
        console.warn(
          "⚠️  WafHttpApi Warning: Hosted zone provided without domain - hosted zone will be ignored.\n" +
            "   📋 Issue: A Route 53 hosted zone was provided but no domain was specified.\n" +
            "   🔧 Solution: Choose one of the following options:\n" +
            "      • Add a 'domain' property to your WafHttpApiProps to use the hosted zone\n" +
            "      • Remove the 'hostedZone' property if you don't need automatic DNS records\n" +
            "   💡 Example: { httpApi, domain: 'api.example.com', hostedZone: yourHostedZone }",
        );
      }
    }

    // Generate a cryptographically strong random hex string for the secret header value.
    // This ensures that the secret is unique and difficult to guess, enhancing security
    // when used for origin verification.
    this.secretHeaderValue = crypto.randomBytes(16).toString("hex");

    // Determine which WAF rules to apply. If custom rules are provided via props, use them.
    // Otherwise, fall back to the default managed rules defined in `createDefaultRules()`.
    const rules = props.wafRules ?? this.createDefaultRules();

    // 1. Create the AWS WAF WebACL (Web Access Control List)
    // This WebACL will be associated with the CloudFront distribution to filter web traffic.
    const webAcl = new wafv2.CfnWebACL(this, "WebAcl", {
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
    this.distribution = new cloudfront.Distribution(this, "ApiDistribution", {
      comment: `CloudFront distribution for HTTP API: ${props.httpApi.httpApiId}`, // Descriptive comment for the distribution.
      // Associate the created WAF WebACL with this CloudFront distribution.
      webAclId: webAcl.attrArn,
      // Add domain aliases when a custom domain is provided
      domainNames: props.domain ? [props.domain] : undefined,
      // Configure viewer certificate when a certificate is available
      certificate: this.certificate,
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
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
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
    });

    // 3. Create DNS records if both hosted zone and domain are provided
    if (props.hostedZone && props.domain) {
      try {
        // Create A record (IPv4) pointing to the CloudFront distribution
        this.aRecord = new route53.ARecord(this, "DomainARecord", {
          zone: props.hostedZone,
          recordName: props.domain,
          target: route53.RecordTarget.fromAlias(
            new route53Targets.CloudFrontTarget(this.distribution),
          ),
          comment: `A record for ${props.domain} pointing to CloudFront distribution`,
        });

        // Create AAAA record (IPv6) pointing to the CloudFront distribution
        this.aaaaRecord = new route53.AaaaRecord(this, "DomainAAAARecord", {
          zone: props.hostedZone,
          recordName: props.domain,
          target: route53.RecordTarget.fromAlias(
            new route53Targets.CloudFrontTarget(this.distribution),
          ),
          comment: `AAAA record for ${props.domain} pointing to CloudFront distribution`,
        });
      } catch (error) {
        // Handle DNS record creation failures with descriptive error messages
        if (error instanceof Error) {
          throw new Error(
            `Failed to create DNS records for domain '${props.domain}' in WafHttpApi construct '${id}': ${error.message}\n` +
              `📍 Hosted Zone: ${props.hostedZone.zoneName}\n` +
              `📍 Domain: ${props.domain}\n` +
              `📍 CloudFront Distribution: ${this.distribution.distributionDomainName}\n` +
              "🔧 Troubleshooting steps:\n" +
              "   1. Verify your hosted zone exists and is accessible\n" +
              "   2. Ensure you have permissions to create Route 53 records (route53:ChangeResourceRecordSets)\n" +
              "   3. Check that the domain doesn't already have conflicting A or AAAA records\n" +
              "   4. Verify the hosted zone covers the specified domain (domain must match or be subdomain)\n" +
              "   5. Confirm your AWS account limits for Route 53 records haven't been exceeded\n" +
              "   6. Check if the hosted zone is in the same AWS account and accessible\n" +
              "   7. Verify that the CloudFront distribution has been fully created before DNS record creation\n" +
              "💡 Common causes and solutions:\n" +
              "   • Conflicting records: Delete existing A/AAAA records for the domain in Route 53\n" +
              "   • Permission issues: Ensure your IAM role has route53:ChangeResourceRecordSets permission\n" +
              "   • Cross-account access: Verify hosted zone delegation if using cross-account setup\n" +
              "   • Domain mismatch: Ensure domain belongs to the hosted zone\n" +
              "🔧 Alternative: Create DNS records manually in Route 53 console\n" +
              `   • A record: ${props.domain} -> ${this.distribution.distributionDomainName}\n` +
              `   • AAAA record: ${props.domain} -> ${this.distribution.distributionDomainName}\n` +
              "📋 Required IAM permissions:\n" +
              "   • route53:ChangeResourceRecordSets\n" +
              "   • route53:GetHostedZone\n" +
              "   • route53:ListResourceRecordSets",
          );
        }
        throw error;
      }
    } else {
      // No hosted zone or domain provided - ensure DNS record properties are undefined
      this.aRecord = undefined;
      this.aaaaRecord = undefined;
    }
  }

  /**
   * @private
   * @method validateDomainFormat
   * @description Validates the format of a domain name using regex pattern matching.
   * Supports apex domains (example.com), subdomains (api.example.com), and wildcard domains (*.example.com).
   * @param {string} domain The domain name to validate
   * @throws {Error} Throws an error with descriptive message if domain format is invalid
   */
  private validateDomainFormat(domain: string): void {
    // Regex pattern for valid domain names:
    // - Supports apex domains: example.com
    // - Supports subdomains: api.example.com, www.api.example.com
    // - Supports wildcard domains: *.example.com
    // - Allows alphanumeric characters, hyphens, and dots
    // - Domain parts cannot start or end with hyphens
    // - TLD must be at least 2 characters
    const domainRegex =
      /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.([a-zA-Z]{2,})$/;

    if (!domain || typeof domain !== "string") {
      throw new Error(
        "❌ Invalid domain format: Domain must be a non-empty string.\n" +
          "🔧 Solution: Provide a valid domain name as a string.\n" +
          "💡 Valid examples:\n" +
          "   • Apex domain: 'example.com'\n" +
          "   • Subdomain: 'api.example.com'\n" +
          "   • Wildcard: '*.example.com'\n" +
          "📝 Current value: " +
          (domain === null
            ? "null"
            : domain === undefined
              ? "undefined"
              : `"${domain}" (type: ${typeof domain})`),
      );
    }

    if (domain.length > 253) {
      throw new Error(
        "❌ Invalid domain format: Domain name exceeds maximum length of 253 characters.\n" +
          `📏 Current length: ${domain.length} characters\n` +
          `📝 Provided domain: "${domain}"\n` +
          "🔧 Solution: Use a shorter domain name that complies with DNS standards.",
      );
    }

    // Check for wildcard domain issues before general regex validation
    if (domain.startsWith("*.")) {
      const wildcardDomain = domain.substring(2);
      if (wildcardDomain.includes("*")) {
        throw new Error(
          `❌ Invalid wildcard domain format: "${domain}" contains multiple wildcards.\n` +
            "📋 Wildcard domain rules:\n" +
            "   • Only a single wildcard (*) is allowed\n" +
            "   • Wildcard must be at the beginning of the domain\n" +
            "   • Format: '*.example.com'\n" +
            "💡 Valid wildcard examples:\n" +
            "   • '*.example.com' (covers api.example.com, www.example.com, etc.)\n" +
            "   • '*.api.example.com' (covers v1.api.example.com, v2.api.example.com, etc.)\n" +
            "🔧 Solution: Use only one wildcard at the beginning of your domain.",
        );
      }
    }

    if (!domainRegex.test(domain)) {
      throw new Error(
        `❌ Invalid domain format: "${domain}" is not a valid domain name.\n` +
          "📋 Domain validation rules:\n" +
          "   • Must contain only alphanumeric characters, hyphens, and dots\n" +
          "   • Each part cannot start or end with a hyphen\n" +
          "   • Top-level domain must be at least 2 characters\n" +
          "   • Maximum 63 characters per label\n" +
          "💡 Valid examples:\n" +
          "   • Apex domain: 'example.com'\n" +
          "   • Subdomain: 'api.example.com', 'www.api.example.com'\n" +
          "   • Wildcard: '*.example.com'\n" +
          "🔧 Solution: Correct the domain format to match DNS naming conventions.",
      );
    }
  }

  /**
   * @private
   * @method validateCertificateRegion
   * @description Validates that the provided certificate is in the us-east-1 region.
   * CloudFront requires certificates to be in us-east-1 region for custom domains.
   * @param {acm.ICertificate} certificate The certificate to validate
   * @throws {Error} Throws an error if certificate is not in us-east-1 region
   */
  private validateCertificateRegion(certificate: acm.ICertificate): void {
    // Extract the region from the certificate ARN
    // ARN format: arn:aws:acm:region:account-id:certificate/certificate-id
    const certificateArn = certificate.certificateArn;

    if (!certificateArn) {
      throw new Error(
        "❌ Certificate validation failed: Certificate ARN is not available.\n" +
          "📋 Issue: The provided certificate does not have an accessible ARN.\n" +
          "🔧 Troubleshooting steps:\n" +
          "   1. Verify the certificate exists in your AWS account\n" +
          "   2. Check that you have the necessary IAM permissions to access the certificate\n" +
          "   3. Ensure the certificate is properly imported or created in ACM\n" +
          "   4. If using Certificate.fromCertificateArn(), verify the ARN is correct\n" +
          "💡 Example of valid certificate ARN:\n" +
          "   arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );
    }

    // Parse the ARN to extract the region
    const arnParts = certificateArn.split(":");
    if (arnParts.length < 4) {
      throw new Error(
        "❌ Certificate validation failed: Invalid certificate ARN format.\n" +
          `📝 Provided ARN: ${certificateArn}\n` +
          "📋 Expected ARN format: arn:aws:acm:region:account-id:certificate/certificate-id\n" +
          "🔧 Solution: Verify your certificate ARN follows the correct AWS ARN format.\n" +
          "💡 Example of valid certificate ARN:\n" +
          "   arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      );
    }

    const certificateRegion = arnParts[3];

    if (certificateRegion !== "us-east-1") {
      throw new Error(
        "❌ Certificate region validation failed: Certificate must be in us-east-1 region for CloudFront compatibility.\n" +
          `📍 Certificate current region: ${certificateRegion}\n` +
          `📝 Certificate ARN: ${certificateArn}\n` +
          "📋 CloudFront requirement: Custom domain certificates must be in us-east-1 region\n" +
          "🔧 Solutions:\n" +
          "   1. Create a new certificate in the us-east-1 region:\n" +
          "      • Go to AWS Certificate Manager in us-east-1 region\n" +
          "      • Request or import your certificate there\n" +
          "   2. Use AWS CLI to copy certificate to us-east-1:\n" +
          "      • Export certificate from current region\n" +
          "      • Import it into us-east-1 region\n" +
          "   3. Update your CDK code to reference the us-east-1 certificate\n" +
          "💡 Note: This is an AWS CloudFront limitation, not a CDK limitation.",
      );
    }
  }

  /**
   * @private
   * @method validateCertificateDomainCompatibility
   * @description Validates that the provided certificate covers the specified domain.
   * This ensures the certificate can be used for the custom domain configuration.
   * @param {acm.ICertificate} certificate The certificate to validate
   * @param {string} domain The domain that should be covered by the certificate
   * @throws {Error} Throws an error if certificate doesn't cover the domain
   */
  private validateCertificateDomainCompatibility(
    certificate: acm.ICertificate,
    domain: string,
  ): void {
    // Note: In a real CDK environment, we would need to use custom resources or
    // AWS SDK calls to retrieve certificate details and validate domain coverage.
    // For synthesis-time validation, we can only perform basic checks.

    // Basic validation: ensure both certificate and domain are provided
    if (!certificate || !domain) {
      throw new Error(
        "❌ Certificate domain compatibility validation failed: Both certificate and domain must be provided.\n" +
          "📋 Issue: Missing required parameters for validation.\n" +
          "🔧 Solution: Ensure both certificate and domain are properly configured in your WafHttpApiProps.\n" +
          "💡 Example: { httpApi, domain: 'api.example.com', certificate: yourCertificate }",
      );
    }

    // Extract domain name from certificate ARN if it contains domain information
    // This is a simplified check - in practice, you might need to use AWS SDK
    // to describe the certificate and get its domain names
    const certificateArn = certificate.certificateArn;

    if (!certificateArn) {
      throw new Error(
        "❌ Certificate domain compatibility validation failed: Certificate ARN is not available.\n" +
          `📝 Domain to validate: ${domain}\n` +
          "📋 Issue: Cannot verify domain compatibility without certificate details.\n" +
          "🔧 Troubleshooting steps:\n" +
          "   1. Verify the certificate exists and is accessible\n" +
          "   2. Check your IAM permissions for ACM certificate access\n" +
          "   3. Ensure the certificate ARN is correctly formatted\n" +
          "   4. If using Certificate.fromCertificateArn(), verify the ARN parameter\n" +
          "💡 Note: Full domain compatibility validation requires runtime AWS API access.",
      );
    }

    // For wildcard certificates, we need to check if the domain matches the wildcard pattern
    // This is a basic implementation - in production, you might want more sophisticated matching
    if (domain.startsWith("*.")) {
      // If the provided domain is a wildcard, we can't easily validate compatibility at synthesis time
      // This would require runtime validation using AWS SDK
      console.warn(
        "⚠️  Certificate domain compatibility: Wildcard domain validation is limited at synthesis time.\n" +
          `   📝 Domain: ${domain}\n` +
          `   📝 Certificate ARN: ${certificateArn}\n` +
          "   💡 Recommendation: Verify your certificate covers the wildcard domain pattern.\n" +
          "   🔧 Manual verification: Check AWS Certificate Manager console to confirm domain coverage.",
      );
      return;
    }

    // Note: This is a simplified validation. In a real implementation, you would:
    // 1. Use AWS SDK to describe the certificate
    // 2. Get the list of domain names covered by the certificate
    // 3. Check if the provided domain matches any of the certificate's domains
    // 4. Handle wildcard certificate matching logic

    // For now, we'll add a warning that full validation requires runtime checks
    console.warn(
      "⚠️  Certificate domain compatibility: Full validation requires runtime AWS API access.\n" +
        `   📝 Domain to validate: ${domain}\n` +
        `   📝 Certificate ARN: ${certificateArn}\n` +
        "   💡 Please manually verify your certificate covers the specified domain.\n" +
        "   🔧 Verification steps:\n" +
        "      1. Go to AWS Certificate Manager console\n" +
        "      2. Find your certificate and check its domain names\n" +
        "      3. Ensure the domain matches exactly or is covered by a wildcard\n" +
        "   📋 Common domain patterns:\n" +
        "      • Exact match: certificate for 'api.example.com' covers 'api.example.com'\n" +
        "      • Wildcard match: certificate for '*.example.com' covers 'api.example.com'\n" +
        "      • Multiple domains: certificate can cover multiple specific domains",
    );
  }

  /**
   * @private
   * @method validateHostedZoneDomainCompatibility
   * @description Validates that the provided domain matches or is a subdomain of the hosted zone's domain.
   * This ensures that DNS records can be properly created in the hosted zone.
   * @param {route53.IHostedZone} hostedZone The hosted zone to validate against
   * @param {string} domain The domain that should belong to the hosted zone
   * @throws {Error} Throws an error if domain doesn't match or isn't a subdomain of the hosted zone
   */
  private validateHostedZoneDomainCompatibility(
    hostedZone: route53.IHostedZone,
    domain: string,
  ): void {
    // Basic validation: ensure both hosted zone and domain are provided
    if (!hostedZone || !domain) {
      throw new Error(
        "❌ Hosted zone domain compatibility validation failed: Both hosted zone and domain must be provided.\n" +
          "📋 Issue: Missing required parameters for validation.\n" +
          "🔧 Solution: Ensure both hostedZone and domain are properly configured in your WafHttpApiProps.\n" +
          "💡 Example: { httpApi, domain: 'api.example.com', hostedZone: yourHostedZone }",
      );
    }

    // Get the hosted zone's domain name
    const hostedZoneName = hostedZone.zoneName;

    if (!hostedZoneName) {
      throw new Error(
        "❌ Hosted zone domain compatibility validation failed: Hosted zone name is not available.\n" +
          `📝 Domain to validate: ${domain}\n` +
          "📋 Issue: Cannot verify domain compatibility without hosted zone details.\n" +
          "🔧 Troubleshooting steps:\n" +
          "   1. Verify the hosted zone exists and is accessible\n" +
          "   2. Check your IAM permissions for Route 53 hosted zone access\n" +
          "   3. Ensure the hosted zone is properly imported or referenced\n" +
          "   4. If using HostedZone.fromLookup(), verify the domain name parameter\n" +
          "💡 Example: HostedZone.fromLookup(this, 'Zone', { domainName: 'example.com' })",
      );
    }

    // Normalize domain names by removing trailing dots and converting to lowercase
    const normalizedHostedZone = hostedZoneName
      .toLowerCase()
      .replace(/\.$/, "");
    const normalizedDomain = domain.toLowerCase().replace(/\.$/, "");

    // Check if domain matches exactly (apex domain case)
    if (normalizedDomain === normalizedHostedZone) {
      return; // Valid: exact match
    }

    // Check if domain is a subdomain of the hosted zone
    if (normalizedDomain.endsWith("." + normalizedHostedZone)) {
      return; // Valid: subdomain
    }

    // Handle wildcard domains
    if (normalizedDomain.startsWith("*.")) {
      const wildcardBase = normalizedDomain.substring(2); // Remove "*."

      // Check if wildcard base matches hosted zone exactly
      if (wildcardBase === normalizedHostedZone) {
        return; // Valid: *.example.com with hosted zone example.com
      }

      // Check if wildcard base is a subdomain of hosted zone
      if (wildcardBase.endsWith("." + normalizedHostedZone)) {
        return; // Valid: *.api.example.com with hosted zone example.com
      }
    }

    // If we reach here, the domain doesn't match the hosted zone
    throw new Error(
      `❌ Hosted zone domain compatibility validation failed: Domain "${domain}" does not match or is not a subdomain of hosted zone "${hostedZoneName}".\n` +
        `📍 Provided Domain: ${domain}\n` +
        `📍 Hosted Zone: ${hostedZoneName}\n` +
        "📋 Domain validation rules:\n" +
        "   • Apex domain: 'example.com' matches hosted zone 'example.com'\n" +
        "   • Subdomain: 'api.example.com' matches hosted zone 'example.com'\n" +
        "   • Wildcard: '*.example.com' matches hosted zone 'example.com'\n" +
        "   • Wildcard subdomain: '*.api.example.com' matches hosted zone 'example.com'\n" +
        "🔧 Solutions:\n" +
        "   1. Use a domain that belongs to your hosted zone:\n" +
        `      • For hosted zone '${hostedZoneName}': use '${hostedZoneName}' or 'subdomain.${hostedZoneName}'\n` +
        "   2. Create a hosted zone for your domain:\n" +
        `      • Create a hosted zone for '${domain}' or its parent domain\n` +
        "   3. Use a different hosted zone that covers your domain\n" +
        "   4. Verify hosted zone configuration:\n" +
        "      • Check Route 53 console to confirm hosted zone exists\n" +
        "      • Ensure hosted zone name is correctly configured\n" +
        "      • Verify you have access to the hosted zone\n" +
        "💡 Examples of valid combinations:\n" +
        `   • Domain: '${hostedZoneName}', Hosted Zone: '${hostedZoneName}' ✅\n` +
        `   • Domain: 'api.${hostedZoneName}', Hosted Zone: '${hostedZoneName}' ✅\n` +
        `   • Domain: '*.${hostedZoneName}', Hosted Zone: '${hostedZoneName}' ✅\n` +
        "🔍 Troubleshooting steps:\n" +
        "   • Double-check domain spelling and format\n" +
        "   • Verify hosted zone domain name in Route 53 console\n" +
        "   • Ensure no trailing dots in domain or hosted zone name\n" +
        "   • Check if you're using the correct hosted zone for your domain",
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
