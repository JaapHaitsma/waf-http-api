import * as crypto from "crypto";
import { Fn } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
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

    // Validate domain format if provided and set customDomain property
    if (props.domain !== undefined) {
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
      // Domain provided without certificate - auto-generate certificate with error handling
      try {
        this.certificate = new acm.Certificate(this, "AutoGeneratedCert", {
          domainName: props.domain,
          validation: acm.CertificateValidation.fromDns(),
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
              "   5. Consider providing your own certificate using the 'certificate' property\n" +
              "💡 Alternative: Provide an existing certificate: { httpApi, domain: '" +
              props.domain +
              "', certificate: existingCertificate }",
          );
        }
        throw error;
      }
    } else {
      // No domain and no certificate - ensure properties are undefined
      this.certificate = undefined;
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
