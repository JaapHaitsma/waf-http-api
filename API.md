# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### WafHttpApi <a name="WafHttpApi" id="waf-http-api.WafHttpApi"></a>

*Example*

```typescript
// Usage with custom WAF rules and domain
const customRulesApi = new WafHttpApi(this, 'CustomRulesApi', {
  httpApi: myHttpApi,
  domain: 'secure-api.example.com',
  wafRules: [
    {
      name: 'RateLimitRule',
      priority: 10,
      statement: {
        rateBasedStatement: {
          limit: 2000,
          aggregateKeyType: 'IP',
        },
      },
      action: { block: {} },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRule',
        sampledRequestsEnabled: true,
      },
    },
  ],
});
```


#### Initializers <a name="Initializers" id="waf-http-api.WafHttpApi.Initializer"></a>

```typescript
import { WafHttpApi } from 'waf-http-api'

new WafHttpApi(scope: Construct, id: string, props: WafHttpApiProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | The scope in which to define this construct (e.g., a CDK Stack). |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.id">id</a></code> | <code>string</code> | The unique identifier for this construct within its scope. |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.props">props</a></code> | <code><a href="#waf-http-api.WafHttpApiProps">WafHttpApiProps</a></code> | The properties required to configure this construct, including the target HTTP API, optional WAF rules, custom domain, and SSL certificate. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="waf-http-api.WafHttpApi.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

The scope in which to define this construct (e.g., a CDK Stack).

---

##### `id`<sup>Required</sup> <a name="id" id="waf-http-api.WafHttpApi.Initializer.parameter.id"></a>

- *Type:* string

The unique identifier for this construct within its scope.

---

##### `props`<sup>Required</sup> <a name="props" id="waf-http-api.WafHttpApi.Initializer.parameter.props"></a>

- *Type:* <a href="#waf-http-api.WafHttpApiProps">WafHttpApiProps</a>

The properties required to configure this construct, including the target HTTP API, optional WAF rules, custom domain, and SSL certificate.

**Props Configuration:**
- `httpApi` (required): The HTTP API Gateway to protect
- `wafRules` (optional): Custom WAF rules, defaults to AWS managed rules
- `domain` (optional): Custom domain name for the CloudFront distribution
- `certificate` (optional): SSL certificate for the custom domain (must be in us-east-1)

**Custom Domain Behavior:**
- If `domain` is provided without `certificate`: ACM certificate is auto-generated
- If both `domain` and `certificate` are provided: Uses the provided certificate
- If `certificate` is provided without `domain`: Certificate is ignored with warning
- If neither is provided: Uses default CloudFront domain only

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="waf-http-api.WafHttpApi.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="waf-http-api.WafHttpApi.isConstruct"></a>

```typescript
import { WafHttpApi } from 'waf-http-api'

WafHttpApi.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="waf-http-api.WafHttpApi.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#waf-http-api.WafHttpApi.property.distribution">distribution</a></code> | <code>aws-cdk-lib.aws_cloudfront.Distribution</code> | The CloudFront distribution created and managed by this construct. |
| <code><a href="#waf-http-api.WafHttpApi.property.secretHeaderValue">secretHeaderValue</a></code> | <code>string</code> | The randomly generated secret value for the custom header. |
| <code><a href="#waf-http-api.WafHttpApi.property.certificate">certificate</a></code> | <code>aws-cdk-lib.aws_certificatemanager.ICertificate</code> | The SSL certificate used for the custom domain. |
| <code><a href="#waf-http-api.WafHttpApi.property.customDomain">customDomain</a></code> | <code>string</code> | The custom domain name configured for this distribution. |

---

##### `node`<sup>Required</sup> <a name="node" id="waf-http-api.WafHttpApi.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `distribution`<sup>Required</sup> <a name="distribution" id="waf-http-api.WafHttpApi.property.distribution"></a>

```typescript
public readonly distribution: Distribution;
```

- *Type:* aws-cdk-lib.aws_cloudfront.Distribution

The CloudFront distribution created and managed by this construct.

You can use this property to retrieve the distribution's domain name or ARN.

---

*Example*

```typescript
// Access the CloudFront distribution domain name
const distributionDomain = wafHttpApi.distribution.distributionDomainName;

// Access the distribution ARN
const distributionArn = wafHttpApi.distribution.distributionArn;

// Use in CloudFormation outputs
new CfnOutput(this, 'DistributionEndpoint', {
  value: `https://${wafHttpApi.distribution.distributionDomainName}`,
  description: 'CloudFront distribution endpoint'
});
```


##### `secretHeaderValue`<sup>Required</sup> <a name="secretHeaderValue" id="waf-http-api.WafHttpApi.property.secretHeaderValue"></a>

```typescript
public readonly secretHeaderValue: string;
```

- *Type:* string

The randomly generated secret value for the custom header.

This value is unique for each deployment of the construct and should be used
in your HTTP API's authorizer or backend logic to validate that requests
are coming through CloudFront and not directly from the internet.

---

*Example*

```typescript
// Use in Lambda authorizer
export const handler = async (event: APIGatewayProxyEvent) => {
  const secretHeader = event.headers[WafHttpApi.SECRET_HEADER_NAME];
  const expectedSecret = process.env.CLOUDFRONT_SECRET; // Set from wafHttpApi.secretHeaderValue

  if (secretHeader !== expectedSecret) {
    throw new Error('Unauthorized: Request not from CloudFront');
  }

  // Continue with request processing...
};

// Set as environment variable in Lambda
const lambda = new NodejsFunction(this, 'ApiHandler', {
  environment: {
    CLOUDFRONT_SECRET: wafHttpApi.secretHeaderValue
  }
});
```


##### `certificate`<sup>Optional</sup> <a name="certificate" id="waf-http-api.WafHttpApi.property.certificate"></a>

```typescript
public readonly certificate: ICertificate;
```

- *Type:* aws-cdk-lib.aws_certificatemanager.ICertificate

The SSL certificate used for the custom domain.

This property will be defined in the following scenarios:
- When a certificate is provided via the `certificate` prop
- When a certificate is automatically generated for a custom domain

The property will be `undefined` when no custom domain is configured.

---

*Example*

```typescript
// Check if certificate is available
if (wafHttpApi.certificate) {
  // Output certificate ARN
  new CfnOutput(this, 'CertificateArn', {
    value: wafHttpApi.certificate.certificateArn,
    description: 'SSL certificate ARN'
  });

  // Use certificate in other resources
  const loadBalancer = new ApplicationLoadBalancer(this, 'ALB', {
    // ... other props
  });

  loadBalancer.addListener('HttpsListener', {
    port: 443,
    certificates: [wafHttpApi.certificate],
    // ... other listener props
  });
}
```


##### `customDomain`<sup>Optional</sup> <a name="customDomain" id="waf-http-api.WafHttpApi.property.customDomain"></a>

```typescript
public readonly customDomain: string;
```

- *Type:* string

The custom domain name configured for this distribution.

This property will be defined when a domain is provided via the `domain` prop.
It will be `undefined` when no custom domain is configured.

---

*Example*

```typescript
// Check if custom domain is configured
if (wafHttpApi.customDomain) {
  // Output custom domain endpoint
  new CfnOutput(this, 'CustomDomainEndpoint', {
    value: `https://${wafHttpApi.customDomain}`,
    description: 'Custom domain API endpoint'
  });

  // Use domain in Route53 record
  new ARecord(this, 'ApiRecord', {
    zone: hostedZone,
    recordName: wafHttpApi.customDomain,
    target: RecordTarget.fromAlias(
      new CloudFrontTarget(wafHttpApi.distribution)
    ),
  });
} else {
  // Use CloudFront default domain
  new CfnOutput(this, 'DefaultEndpoint', {
    value: `https://${wafHttpApi.distribution.distributionDomainName}`,
    description: 'Default CloudFront endpoint'
  });
}
```


#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.property.SECRET_HEADER_NAME">SECRET_HEADER_NAME</a></code> | <code>string</code> | *No description.* |

---

##### `SECRET_HEADER_NAME`<sup>Required</sup> <a name="SECRET_HEADER_NAME" id="waf-http-api.WafHttpApi.property.SECRET_HEADER_NAME"></a>

```typescript
public readonly SECRET_HEADER_NAME: string;
```

- *Type:* string

---

## Structs <a name="Structs" id="Structs"></a>

### WafHttpApiProps <a name="WafHttpApiProps" id="waf-http-api.WafHttpApiProps"></a>

#### Initializer <a name="Initializer" id="waf-http-api.WafHttpApiProps.Initializer"></a>

```typescript
import { WafHttpApiProps } from 'waf-http-api'

const wafHttpApiProps: WafHttpApiProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#waf-http-api.WafHttpApiProps.property.httpApi">httpApi</a></code> | <code>aws-cdk-lib.aws_apigatewayv2.HttpApi</code> | The HTTP API to be protected by the WAF and CloudFront. |
| <code><a href="#waf-http-api.WafHttpApiProps.property.certificate">certificate</a></code> | <code>aws-cdk-lib.aws_certificatemanager.ICertificate</code> | Optional: SSL certificate for the custom domain. |
| <code><a href="#waf-http-api.WafHttpApiProps.property.domain">domain</a></code> | <code>string</code> | Optional: Custom domain name for the CloudFront distribution. |
| <code><a href="#waf-http-api.WafHttpApiProps.property.wafRules">wafRules</a></code> | <code>aws-cdk-lib.aws_wafv2.CfnWebACL.RuleProperty[]</code> | Optional: Custom WAF rules to apply to the WebACL. |

---

##### `httpApi`<sup>Required</sup> <a name="httpApi" id="waf-http-api.WafHttpApiProps.property.httpApi"></a>

```typescript
public readonly httpApi: HttpApi;
```

- *Type:* aws-cdk-lib.aws_apigatewayv2.HttpApi

The HTTP API to be protected by the WAF and CloudFront.

This should be an instance of `aws-cdk-lib/aws-apigatewayv2.HttpApi`.
The API will be fronted by a CloudFront distribution with WAF protection.

---

*Example*

```typescript
const httpApi = new HttpApi(this, 'MyApi', {
  description: 'My protected HTTP API'
});
```


##### `certificate`<sup>Optional</sup> <a name="certificate" id="waf-http-api.WafHttpApiProps.property.certificate"></a>

```typescript
public readonly certificate: ICertificate;
```

- *Type:* aws-cdk-lib.aws_certificatemanager.ICertificate

Optional: SSL certificate for the custom domain.

Must be an ACM certificate in the us-east-1 region for CloudFront compatibility.
If not provided and a domain is specified, a certificate will be automatically generated
using DNS validation.

**Important Requirements:**
- Certificate must be in us-east-1 region (CloudFront requirement)
- Certificate must cover the specified domain (exact match or wildcard)
- Certificate must be valid and accessible

---

*Example*

```typescript
// Using existing certificate
const existingCert = Certificate.fromCertificateArn(
  this,
  'ExistingCert',
  'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012'
);

// In props
certificate: existingCert
```


##### `domain`<sup>Optional</sup> <a name="domain" id="waf-http-api.WafHttpApiProps.property.domain"></a>

```typescript
public readonly domain: string;
```

- *Type:* string

Optional: Custom domain name for the CloudFront distribution.

When provided, the CloudFront distribution will be configured to accept requests on this domain.
If no certificate is provided, an ACM certificate will be automatically generated with DNS validation.

Supports various domain formats:
- Apex domains: `example.com`
- Subdomains: `api.example.com`, `www.api.example.com`
- Wildcard domains: `*.example.com`

---

*Example*

```typescript
// Apex domain
domain: 'example.com'

// Subdomain
domain: 'api.example.com'

// Wildcard domain
domain: '*.api.example.com'
```


##### `wafRules`<sup>Optional</sup> <a name="wafRules" id="waf-http-api.WafHttpApiProps.property.wafRules"></a>

```typescript
public readonly wafRules: RuleProperty[];
```

- *Type:* aws-cdk-lib.aws_wafv2.CfnWebACL.RuleProperty[]
- *Default:* AWS Managed Rules (AmazonIpReputationList, CommonRuleSet)

Optional: Custom WAF rules to apply to the WebACL.

If not provided, a default set of AWS Managed Rules will be used,
specifically "AWSManagedRulesAmazonIpReputationList" and "AWSManagedRulesCommonRuleSet".
These rules help protect against common web exploits and unwanted traffic.

---

*Example*

```typescript
wafRules: [
  {
    name: 'RateLimitRule',
    priority: 10,
    statement: {
      rateBasedStatement: {
        limit: 2000,
        aggregateKeyType: 'IP',
      },
    },
    action: { block: {} },
    visibilityConfig: {
      cloudWatchMetricsEnabled: true,
      metricName: 'RateLimitRule',
      sampledRequestsEnabled: true,
    },
  },
]
```




