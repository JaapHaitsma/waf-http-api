# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### WafHttpApi <a name="WafHttpApi" id="waf-http-api.WafHttpApi"></a>

_Example_

```typescript
// Usage with hosted zone for automatic DNS record creation
const hostedZone = HostedZone.fromLookup(this, "MyZone", {
  domainName: "example.com",
});

const apiWithDns = new WafHttpApi(this, "ApiWithDNS", {
  httpApi: myHttpApi,
  domain: "api.example.com",
  hostedZone: hostedZone,
});

// Access the automatically created DNS records
if (apiWithDns.aRecord) {
  new CfnOutput(this, "ARecordName", {
    value: apiWithDns.aRecord.domainName,
    description: "A record for the API domain",
  });
}

if (apiWithDns.aaaaRecord) {
  new CfnOutput(this, "AAAARecordName", {
    value: apiWithDns.aaaaRecord.domainName,
    description: "AAAA record for the API domain",
  });
}
```

#### Initializers <a name="Initializers" id="waf-http-api.WafHttpApi.Initializer"></a>

```typescript
import { WafHttpApi } from 'waf-http-api'

new WafHttpApi(scope: Construct, id: string, props: WafHttpApiProps)
```

| **Name**                                                                              | **Type**                                                                 | **Description**                                                                                                                             |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code>                                        | The scope in which to define this construct (e.g., a CDK Stack).                                                                            |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.id">id</a></code>       | <code>string</code>                                                      | The unique identifier for this construct within its scope.                                                                                  |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.props">props</a></code> | <code><a href="#waf-http-api.WafHttpApiProps">WafHttpApiProps</a></code> | The properties required to configure this construct, including the target HTTP API, optional WAF rules, custom domain, and SSL certificate. |

---

##### `scope`<sup>Required</sup> <a name="scope" id="waf-http-api.WafHttpApi.Initializer.parameter.scope"></a>

- _Type:_ constructs.Construct

The scope in which to define this construct (e.g., a CDK Stack).

---

##### `id`<sup>Required</sup> <a name="id" id="waf-http-api.WafHttpApi.Initializer.parameter.id"></a>

- _Type:_ string

The unique identifier for this construct within its scope.

---

##### `props`<sup>Required</sup> <a name="props" id="waf-http-api.WafHttpApi.Initializer.parameter.props"></a>

- _Type:_ <a href="#waf-http-api.WafHttpApiProps">WafHttpApiProps</a>

The properties required to configure this construct, including the target HTTP API, optional WAF rules, custom domain, and SSL certificate.

**Props Configuration:**

- `httpApi` (required): The HTTP API Gateway to protect
- `wafRules` (optional): Custom WAF rules, defaults to AWS managed rules
- `domain` (optional): Custom domain name for the CloudFront distribution
- `certificate` (optional): SSL certificate for the custom domain (must be in us-east-1)
- `secretHeaderValue` (optional): Bring your own origin verification secret

**Origin Verification Secret Behavior:**

- If not provided: a Secrets Manager secret is created and referenced (deterministic)
- If provided: that value is used verbatim and no Secrets Manager secret is created

**Custom Domain Behavior:**

- If `domain` is provided without `certificate`: ACM certificate is auto-generated
- If both `domain` and `certificate` are provided: Uses the provided certificate
- If `certificate` is provided without `domain`: Certificate is ignored with warning
- If neither is provided: Uses default CloudFront domain only

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name**                                                              | **Description**                                    |
| --------------------------------------------------------------------- | -------------------------------------------------- |
| <code><a href="#waf-http-api.WafHttpApi.toString">toString</a></code> | Returns a string representation of this construct. |
| <code><a href="#waf-http-api.WafHttpApi.with">with</a></code>         | Applies one or more mixins to this construct.      |

---

##### `toString` <a name="toString" id="waf-http-api.WafHttpApi.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

##### `with` <a name="with" id="waf-http-api.WafHttpApi.with"></a>

```typescript
public with(mixins: ...IMixin[]): IConstruct
```

Applies one or more mixins to this construct.

Mixins are applied in order. The list of constructs is captured at the
start of the call, so constructs added by a mixin will not be visited.
Use multiple `with()` calls if subsequent mixins should apply to added
constructs.

###### `mixins`<sup>Required</sup> <a name="mixins" id="waf-http-api.WafHttpApi.with.parameter.mixins"></a>

- _Type:_ ...constructs.IMixin[]

The mixins to apply.

---

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name**                                                                    | **Description**               |
| --------------------------------------------------------------------------- | ----------------------------- |
| <code><a href="#waf-http-api.WafHttpApi.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### `isConstruct` <a name="isConstruct" id="waf-http-api.WafHttpApi.isConstruct"></a>

```typescript
import { WafHttpApi } from 'waf-http-api'

WafHttpApi.isConstruct(x: any)
```

Checks if `x` is a construct.

Use this method instead of `instanceof` to properly detect `Construct`
instances, even when the construct library is symlinked.

Explanation: in JavaScript, multiple copies of the `constructs` library on
disk are seen as independent, completely different libraries. As a
consequence, the class `Construct` in each copy of the `constructs` library
is seen as a different class, and an instance of one class will not test as
`instanceof` the other class. `npm install` will not create installations
like this, but users may manually symlink construct libraries together or
use a monorepo tool: in those cases, multiple copies of the `constructs`
library can be accidentally installed, and `instanceof` will behave
unpredictably. It is safest to avoid using `instanceof`, and using
this type-testing method instead.

###### `x`<sup>Required</sup> <a name="x" id="waf-http-api.WafHttpApi.isConstruct.parameter.x"></a>

- _Type:_ any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name**                                                                                               | **Type**                                                     | **Description**                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| <code><a href="#waf-http-api.WafHttpApi.property.node">node</a></code>                                 | <code>constructs.Node</code>                                 | The tree node.                                                                                                                                  |
| <code><a href="#waf-http-api.WafHttpApi.property.acceptedSecretValues">acceptedSecretValues</a></code> | <code>string[]</code>                                        | Every secret value your origin should accept — the value CloudFront is sending now, plus the previous generation while a rotation is in flight. |
| <code><a href="#waf-http-api.WafHttpApi.property.distribution">distribution</a></code>                 | <code>aws-cdk-lib.aws_cloudfront.Distribution</code>         | The CloudFront distribution created and managed by this construct.                                                                              |
| <code><a href="#waf-http-api.WafHttpApi.property.secretHeaderValue">secretHeaderValue</a></code>       | <code>string</code>                                          | The secret value CloudFront sends to the origin in the `X-Origin-Verify` header.                                                                |
| <code><a href="#waf-http-api.WafHttpApi.property.webAclMetricName">webAclMetricName</a></code>         | <code>string</code>                                          | The CloudWatch metric name of the AWS WAF WebACL.                                                                                               |
| <code><a href="#waf-http-api.WafHttpApi.property.aaaaRecord">aaaaRecord</a></code>                     | <code>aws-cdk-lib.aws_route53.AaaaRecord</code>              | The Route 53 AAAA record created for the custom domain.                                                                                         |
| <code><a href="#waf-http-api.WafHttpApi.property.aRecord">aRecord</a></code>                           | <code>aws-cdk-lib.aws_route53.ARecord</code>                 | The Route 53 A record created for the custom domain.                                                                                            |
| <code><a href="#waf-http-api.WafHttpApi.property.certificate">certificate</a></code>                   | <code>aws-cdk-lib.aws_certificatemanager.ICertificate</code> | The SSL certificate used for the custom domain.                                                                                                 |
| <code><a href="#waf-http-api.WafHttpApi.property.customDomain">customDomain</a></code>                 | <code>string</code>                                          | The custom domain name configured for this distribution.                                                                                        |
| <code><a href="#waf-http-api.WafHttpApi.property.originSecret">originSecret</a></code>                 | <code>aws-cdk-lib.aws_secretsmanager.ISecret</code>          | The AWS Secrets Manager secret holding the origin verification value.                                                                           |
| <code><a href="#waf-http-api.WafHttpApi.property.previousOriginSecret">previousOriginSecret</a></code> | <code>aws-cdk-lib.aws_secretsmanager.ISecret</code>          | The previous generation of the construct-managed secret, still accepted during a rotation.                                                      |
| <code><a href="#waf-http-api.WafHttpApi.property.webAclName">webAclName</a></code>                     | <code>string</code>                                          | The explicit name given to the AWS WAF WebACL, if one was requested via the `webAclName` prop.                                                  |

---

##### `node`<sup>Required</sup> <a name="node" id="waf-http-api.WafHttpApi.property.node"></a>

```typescript
public readonly node: Node;
```

- _Type:_ constructs.Node

The tree node.

---

##### `acceptedSecretValues`<sup>Required</sup> <a name="acceptedSecretValues" id="waf-http-api.WafHttpApi.property.acceptedSecretValues"></a>

```typescript
public readonly acceptedSecretValues: string[];
```

- _Type:_ string[]

Every secret value your origin should accept — the value CloudFront is sending now, plus the previous generation while a rotation is in flight.

Always contains at least `secretHeaderValue`. It contains two entries when
`originSecretGeneration` is 1 or more.

**This is the property that makes rotation window-free**, and it only works if your origin uses
it. A CloudFront distribution takes about a minute longer to update than an origin's
environment, so during a rotation CloudFront keeps sending the previous value — which is in
this list. Compare the incoming header against every entry, not just `secretHeaderValue`.

Entries may be unresolved deploy-time tokens, so pass them into resource properties rather than
inspecting them at synthesis. See `secretHeaderValue` for what that rules out.

---

_Example_

```typescript
// Node.js origin accepting either value
myLambda.addEnvironment(
  "ACCEPTED_ORIGIN_SECRETS",
  wafHttpApi.acceptedSecretValues.join(","),
);

// in the handler
const accepted = (process.env.ACCEPTED_ORIGIN_SECRETS ?? "").split(",");
const ok = accepted.some((v) => constantTimeEqual(provided, v));
```

##### `distribution`<sup>Required</sup> <a name="distribution" id="waf-http-api.WafHttpApi.property.distribution"></a>

```typescript
public readonly distribution: Distribution;
```

- _Type:_ aws-cdk-lib.aws_cloudfront.Distribution

The CloudFront distribution created and managed by this construct.

You can use this property to retrieve the distribution's domain name or ARN.

---

_Example_

```typescript
// Access the CloudFront distribution domain name
const distributionDomain = wafHttpApi.distribution.distributionDomainName;

// Access the distribution ARN
const distributionArn = wafHttpApi.distribution.distributionArn;

// Use in CloudFormation outputs
new CfnOutput(this, "DistributionEndpoint", {
  value: `https://${wafHttpApi.distribution.distributionDomainName}`,
  description: "CloudFront distribution endpoint",
});
```

##### `secretHeaderValue`<sup>Required</sup> <a name="secretHeaderValue" id="waf-http-api.WafHttpApi.property.secretHeaderValue"></a>

```typescript
public readonly secretHeaderValue: string;
```

- _Type:_ string

The secret value CloudFront sends to the origin in the `X-Origin-Verify` header.

Use it in your HTTP API's authorizer or backend logic to validate that requests are coming
through CloudFront and not directly from the internet.

What this holds depends on how the construct was configured:

- **By default** it is an unresolved CloudFormation dynamic reference to the secret in
  `originSecret`, resolved at deployment time.
- **With the `secretHeaderValue` prop** it is exactly the value you supplied.

**This may therefore be an unresolved token.** A token can be passed into any resource
property — a Lambda environment variable, another construct's props — and CloudFormation
resolves it during deployment. It cannot be inspected at synthesis time: `.length`,
`.substring()` and string comparisons on it are meaningless, and it must **not** be published
through `CfnOutput`, because dynamic references are resolved in resource properties only and a
stack output would emit the literal `{{resolve:...}}` text.

---

_Example_

```typescript
// Use in Lambda authorizer
export const handler = async (event: APIGatewayProxyEvent) => {
  const secretHeader = event.headers[WafHttpApi.SECRET_HEADER_NAME];
  const expectedSecret = process.env.CLOUDFRONT_SECRET; // Set from wafHttpApi.secretHeaderValue

  if (secretHeader !== expectedSecret) {
    throw new Error("Unauthorized: Request not from CloudFront");
  }

  // Continue with request processing...
};

// Set as environment variable in Lambda. This works for every configuration, including an
// unresolved token: CloudFormation resolves it into the function's environment on deploy.
const lambda = new NodejsFunction(this, "ApiHandler", {
  environment: {
    CLOUDFRONT_SECRET: wafHttpApi.secretHeaderValue,
  },
});
```

##### `webAclMetricName`<sup>Required</sup> <a name="webAclMetricName" id="waf-http-api.WafHttpApi.property.webAclMetricName"></a>

```typescript
public readonly webAclMetricName: string;
```

- _Type:_ string

The CloudWatch metric name of the AWS WAF WebACL.

Unlike the physical name, CloudFormation cannot generate this — it is a required property with
no default — so the construct sets it to `<stackName>-<constructId>-WebACL`. That keeps metrics
from two stacks apart even when they reuse the same construct id. If you supplied
`webAclName`, that value is used instead.

---

_Example_

```typescript
// Alarm on blocked requests for this specific WebACL
new Metric({
  namespace: "AWS/WAFV2",
  metricName: "BlockedRequests",
  dimensionsMap: {
    WebACL: wafHttpApi.webAclMetricName,
    Rule: "ALL",
    Region: "global",
  },
});
```

##### `aaaaRecord`<sup>Optional</sup> <a name="aaaaRecord" id="waf-http-api.WafHttpApi.property.aaaaRecord"></a>

```typescript
public readonly aaaaRecord: AaaaRecord;
```

- _Type:_ aws-cdk-lib.aws_route53.AaaaRecord

The Route 53 AAAA record created for the custom domain.

This property will be defined when both `hostedZone` and `domain` are provided,
and the construct automatically creates DNS records pointing to the CloudFront distribution.

The AAAA record maps the custom domain to the CloudFront distribution's IPv6 addresses.

---

_Example_

```typescript
// Check if AAAA record was created
if (wafHttpApi.aaaaRecord) {
  // Output AAAA record details
  new CfnOutput(this, "AAAARecordName", {
    value: wafHttpApi.aaaaRecord.domainName,
    description: "AAAA record domain name",
  });

  // Reference the record in other resources
  const recordArn = wafHttpApi.aaaaRecord.recordArn;
}

// The AAAA record will be undefined if:
// - No hostedZone was provided
// - No domain was provided
// - hostedZone was provided without domain (ignored with warning)
```

##### `aRecord`<sup>Optional</sup> <a name="aRecord" id="waf-http-api.WafHttpApi.property.aRecord"></a>

```typescript
public readonly aRecord: ARecord;
```

- _Type:_ aws-cdk-lib.aws_route53.ARecord

The Route 53 A record created for the custom domain.

This property will be defined when both `hostedZone` and `domain` are provided,
and the construct automatically creates DNS records pointing to the CloudFront distribution.

The A record maps the custom domain to the CloudFront distribution's IPv4 addresses.

---

_Example_

```typescript
// Check if A record was created
if (wafHttpApi.aRecord) {
  // Output A record details
  new CfnOutput(this, "ARecordName", {
    value: wafHttpApi.aRecord.domainName,
    description: "A record domain name",
  });

  // Reference the record in other resources
  const recordArn = wafHttpApi.aRecord.recordArn;
}

// The A record will be undefined if:
// - No hostedZone was provided
// - No domain was provided
// - hostedZone was provided without domain (ignored with warning)
```

##### `certificate`<sup>Optional</sup> <a name="certificate" id="waf-http-api.WafHttpApi.property.certificate"></a>

```typescript
public readonly certificate: ICertificate;
```

- _Type:_ aws-cdk-lib.aws_certificatemanager.ICertificate

The SSL certificate used for the custom domain.

This property will be defined in the following scenarios:

- When a certificate is provided via the `certificate` prop
- When a certificate is automatically generated for a custom domain

The property will be `undefined` when no custom domain is configured.

---

_Example_

```typescript
// Check if certificate is available
if (wafHttpApi.certificate) {
  // Output certificate ARN
  new CfnOutput(this, "CertificateArn", {
    value: wafHttpApi.certificate.certificateArn,
    description: "SSL certificate ARN",
  });

  // Use certificate in other resources
  const loadBalancer = new ApplicationLoadBalancer(this, "ALB", {
    // ... other props
  });

  loadBalancer.addListener("HttpsListener", {
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

- _Type:_ string

The custom domain name configured for this distribution.

This property will be defined when a domain is provided via the `domain` prop.
It will be `undefined` when no custom domain is configured.

---

_Example_

```typescript
// Check if custom domain is configured
if (wafHttpApi.customDomain) {
  // Output custom domain endpoint
  new CfnOutput(this, "CustomDomainEndpoint", {
    value: `https://${wafHttpApi.customDomain}`,
    description: "Custom domain API endpoint",
  });

  // Use domain in Route53 record
  new ARecord(this, "ApiRecord", {
    zone: hostedZone,
    recordName: wafHttpApi.customDomain,
    target: RecordTarget.fromAlias(
      new CloudFrontTarget(wafHttpApi.distribution),
    ),
  });
} else {
  // Use CloudFront default domain
  new CfnOutput(this, "DefaultEndpoint", {
    value: `https://${wafHttpApi.distribution.distributionDomainName}`,
    description: "Default CloudFront endpoint",
  });
}
```

##### `originSecret`<sup>Optional</sup> <a name="originSecret" id="waf-http-api.WafHttpApi.property.originSecret"></a>

```typescript
public readonly originSecret: ISecret;
```

- _Type:_ aws-cdk-lib.aws_secretsmanager.ISecret

The AWS Secrets Manager secret holding the origin verification value.

This property is defined only when the construct manages the secret itself, which is the
default. It is `undefined` when `secretHeaderValue` was supplied.

Use it to grant an origin Lambda read access so it can fetch the value at runtime instead of
receiving it as a plaintext environment variable. That also lets the origin accept both
`AWSCURRENT` and `AWSPREVIOUS` during a rotation, which avoids the rejection window that a
distribution update would otherwise open.

---

_Example_

```typescript
// Let the origin read the secret at runtime rather than baking it into the environment
if (wafHttpApi.originSecret) {
  wafHttpApi.originSecret.grantRead(myLambda);
  myLambda.addEnvironment(
    "ORIGIN_SECRET_ARN",
    wafHttpApi.originSecret.secretArn,
  );
}
```

##### `previousOriginSecret`<sup>Optional</sup> <a name="previousOriginSecret" id="waf-http-api.WafHttpApi.property.previousOriginSecret"></a>

```typescript
public readonly previousOriginSecret: ISecret;
```

- _Type:_ aws-cdk-lib.aws_secretsmanager.ISecret

The previous generation of the construct-managed secret, still accepted during a rotation.

Defined only when `originSecretGeneration` is 1 or more — at generation 0 there is nothing to
fall back on. It is `undefined` when `secretHeaderValue` was supplied, because the construct
manages no secrets in that case.

---

##### `webAclName`<sup>Optional</sup> <a name="webAclName" id="waf-http-api.WafHttpApi.property.webAclName"></a>

```typescript
public readonly webAclName: string;
```

- _Type:_ string

The explicit name given to the AWS WAF WebACL, if one was requested via the `webAclName` prop.

`undefined` by default, because the construct lets CloudFormation generate the physical name —
`<stackName>-<logicalId>-<random>`, which already identifies the stack and this construct, and
which preserves CloudFormation's ability to replace the resource.

To reference the WebACL in CloudWatch, use `webAclMetricName` instead: it is always defined.

---

#### Constants <a name="Constants" id="Constants"></a>

| **Name**                                                                                           | **Type**            | **Description**   |
| -------------------------------------------------------------------------------------------------- | ------------------- | ----------------- |
| <code><a href="#waf-http-api.WafHttpApi.property.SECRET_HEADER_NAME">SECRET_HEADER_NAME</a></code> | <code>string</code> | _No description._ |

---

##### `SECRET_HEADER_NAME`<sup>Required</sup> <a name="SECRET_HEADER_NAME" id="waf-http-api.WafHttpApi.property.SECRET_HEADER_NAME"></a>

```typescript
public readonly SECRET_HEADER_NAME: string;
```

- _Type:_ string

---

## Structs <a name="Structs" id="Structs"></a>

### WafHttpApiProps <a name="WafHttpApiProps" id="waf-http-api.WafHttpApiProps"></a>

#### Initializer <a name="Initializer" id="waf-http-api.WafHttpApiProps.Initializer"></a>

```typescript
import { WafHttpApiProps } from 'waf-http-api'

const wafHttpApiProps: WafHttpApiProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name**                                                                                                        | **Type**                                                     | **Description**                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| <code><a href="#waf-http-api.WafHttpApiProps.property.httpApi">httpApi</a></code>                               | <code>aws-cdk-lib.aws_apigatewayv2.HttpApi</code>            | The HTTP API to be protected by the WAF and CloudFront.                                                                                 |
| <code><a href="#waf-http-api.WafHttpApiProps.property.certificate">certificate</a></code>                       | <code>aws-cdk-lib.aws_certificatemanager.ICertificate</code> | Optional: SSL certificate for the custom domain.                                                                                        |
| <code><a href="#waf-http-api.WafHttpApiProps.property.domain">domain</a></code>                                 | <code>string</code>                                          | Optional: Custom domain name for the CloudFront distribution.                                                                           |
| <code><a href="#waf-http-api.WafHttpApiProps.property.hostedZone">hostedZone</a></code>                         | <code>aws-cdk-lib.aws_route53.IHostedZone</code>             | Optional: Route 53 hosted zone for automatic DNS record creation.                                                                       |
| <code><a href="#waf-http-api.WafHttpApiProps.property.originSecretGeneration">originSecretGeneration</a></code> | <code>number</code>                                          | Optional: The generation of the construct-managed origin verification secret.                                                           |
| <code><a href="#waf-http-api.WafHttpApiProps.property.secretHeaderValue">secretHeaderValue</a></code>           | <code>string</code>                                          | Optional: A fixed value for the CloudFront origin verification secret header (`WafHttpApi.SECRET_HEADER_NAME`, i.e. `X-Origin-Verify`). |
| <code><a href="#waf-http-api.WafHttpApiProps.property.wafRules">wafRules</a></code>                             | <code>aws-cdk-lib.aws_wafv2.CfnWebACL.RuleProperty[]</code>  | Optional: Custom WAF rules to apply to the WebACL.                                                                                      |
| <code><a href="#waf-http-api.WafHttpApiProps.property.webAclName">webAclName</a></code>                         | <code>string</code>                                          | Optional: An explicit name for the AWS WAF WebACL.                                                                                      |

---

##### `httpApi`<sup>Required</sup> <a name="httpApi" id="waf-http-api.WafHttpApiProps.property.httpApi"></a>

```typescript
public readonly httpApi: HttpApi;
```

- _Type:_ aws-cdk-lib.aws_apigatewayv2.HttpApi

The HTTP API to be protected by the WAF and CloudFront.

This should be an instance of `aws-cdk-lib/aws-apigatewayv2.HttpApi`.
The API will be fronted by a CloudFront distribution with WAF protection.

---

_Example_

```typescript
const httpApi = new HttpApi(this, "MyApi", {
  description: "My protected HTTP API",
});
```

##### `certificate`<sup>Optional</sup> <a name="certificate" id="waf-http-api.WafHttpApiProps.property.certificate"></a>

```typescript
public readonly certificate: ICertificate;
```

- _Type:_ aws-cdk-lib.aws_certificatemanager.ICertificate

Optional: SSL certificate for the custom domain.

Must be an ACM certificate in the us-east-1 region for CloudFront compatibility.
If not provided and a domain is specified, a certificate will be automatically generated
using DNS validation.

**Important Requirements:**

- Certificate must be in us-east-1 region (CloudFront requirement)
- Certificate must cover the specified domain (exact match or wildcard)
- Certificate must be valid and accessible

---

_Example_

```typescript
// Using existing certificate
const existingCert = Certificate.fromCertificateArn(
  this,
  "ExistingCert",
  "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
);

// In props
certificate: existingCert;
```

##### `domain`<sup>Optional</sup> <a name="domain" id="waf-http-api.WafHttpApiProps.property.domain"></a>

```typescript
public readonly domain: string;
```

- _Type:_ string

Optional: Custom domain name for the CloudFront distribution.

When provided, the CloudFront distribution will be configured to accept requests on this domain.
If no certificate is provided, an ACM certificate will be automatically generated with DNS validation.

Supports various domain formats:

- Apex domains: `example.com`
- Subdomains: `api.example.com`, `www.api.example.com`
- Wildcard domains: `*.example.com`

---

_Example_

```typescript
// Apex domain
domain: "example.com";

// Subdomain
domain: "api.example.com";

// Wildcard domain
domain: "*.api.example.com";
```

##### `hostedZone`<sup>Optional</sup> <a name="hostedZone" id="waf-http-api.WafHttpApiProps.property.hostedZone"></a>

```typescript
public readonly hostedZone: IHostedZone;
```

- _Type:_ aws-cdk-lib.aws_route53.IHostedZone

Optional: Route 53 hosted zone for automatic DNS record creation.

When provided along with a domain, the construct will automatically create
Route 53 A and AAAA records pointing to the CloudFront distribution.

**Behavior:**

- When both `hostedZone` and `domain` are provided: DNS records are automatically created
- When `hostedZone` is provided without `domain`: Hosted zone is ignored with warning
- When `domain` is provided without `hostedZone`: No DNS records are created
- Domain must match or be a subdomain of the hosted zone's domain

---

_Example_

```typescript
// Using existing hosted zone
const hostedZone = HostedZone.fromLookup(this, "MyZone", {
  domainName: "example.com",
});

// In props with automatic DNS record creation
const protectedApi = new WafHttpApi(this, "MyApi", {
  httpApi: myHttpApi,
  domain: "api.example.com",
  hostedZone: hostedZone,
});

// Access created DNS records
if (protectedApi.aRecord) {
  new CfnOutput(this, "ARecordName", {
    value: protectedApi.aRecord.domainName,
  });
}
```

##### `originSecretGeneration`<sup>Optional</sup> <a name="originSecretGeneration" id="waf-http-api.WafHttpApiProps.property.originSecretGeneration"></a>

```typescript
public readonly originSecretGeneration: number;
```

- _Type:_ number
- _Default:_ 0 - a single secret, no previous value to fall back on

Optional: The generation of the construct-managed origin verification secret.

Increment it to
rotate to a brand-new secret **without a rejection window**.

The managed secret's value is generated by CloudFormation once, at creation, and is then
deliberately stable — that is what makes deployments deterministic. There is consequently no
way to ask for a fresh value by editing the secret in Secrets Manager: the construct references
it with a versionless dynamic reference, and CloudFormation re-resolves a dynamic reference
only for resources it actually updates. Writing a new value into Secrets Manager therefore
changes nothing, and can leave consumers disagreeing if a later unrelated deployment happens to
update only some of them.

This property gives that intent somewhere to live in the template. At generation `n` the
construct keeps **two** secrets, `n` and `n - 1`, and exposes both through
`acceptedSecretValues`. CloudFront always sends generation `n`; your origin should accept
either. Incrementing to `n + 1` mints a new secret, keeps generation `n` valid, and retires
`n - 1`.

That is what removes the window. A CloudFront distribution takes about a minute longer to
update than an origin's environment, so during a rotation CloudFront keeps sending the previous
value for a while — and here that value is still in the accepted set, so nothing is rejected.
See "Origin Secret Stability and Rotation" in the README.

**Your origin has to cooperate.** The construct can hand you both values; it cannot make your
backend accept both. Compare the incoming header against every entry in `acceptedSecretValues`.

Ignored, with a warning, when `secretHeaderValue` is supplied, because no managed secret exists
in that case.

---

_Example_

```typescript
// Rotate with no rejection window: increment and deploy
const protectedApi = new WafHttpApi(this, "MyApi", {
  httpApi: myHttpApi,
  originSecretGeneration: 1,
});

// Hand every accepted value to the backend
myLambda.addEnvironment(
  "ACCEPTED_ORIGIN_SECRETS",
  protectedApi.acceptedSecretValues.join(","),
);
```

##### `secretHeaderValue`<sup>Optional</sup> <a name="secretHeaderValue" id="waf-http-api.WafHttpApiProps.property.secretHeaderValue"></a>

```typescript
public readonly secretHeaderValue: string;
```

- _Type:_ string
- _Default:_ An AWS Secrets Manager secret created and managed by the construct, exposed as `originSecret`

Optional: A fixed value for the CloudFront origin verification secret header (`WafHttpApi.SECRET_HEADER_NAME`, i.e. `X-Origin-Verify`).

Provide this when you want to own the secret's lifecycle yourself instead of letting the
construct manage it. When omitted, the construct creates an AWS Secrets Manager secret whose
value is generated **by CloudFormation at creation time** and references it from the origin
custom header. That is the recommended default: the template then contains only a dynamic
reference, so synthesis is deterministic and a no-op deployment is a no-op diff. The generated
secret is exposed as `originSecret`.

Supplying a value here creates no Secrets Manager resource, so it is also the way to avoid the
secret's monthly cost — for example in short-lived preview stacks.

**Ways to supply the value.** All of the following are plain strings or CDK string tokens
and are accepted here:

| Mechanism                                                                     | What lands in the CloudFormation template                          |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| A literal string                                                              | The plaintext secret                                               |
| `SecretValue.secretsManager('name').unsafeUnwrap()`                           | `{{resolve:secretsmanager:name:SecretString:::}}`                  |
| `new CfnDynamicReference(CfnDynamicReferenceService.SSM, '/name').toString()` | `{{resolve:ssm:/name}}`                                            |
| `StringParameter.valueForStringParameter(this, '/name')`                      | A `Ref` to an `AWS::SSM::Parameter::Value<String>` stack parameter |
| `new CfnParameter(this, 'S', { type: 'String', noEcho: true }).valueAsString` | A `Ref` to a stack parameter                                       |

**SSM SecureString does not work here.** `{{resolve:ssm-secure:...}}` dynamic references are
only resolved in a short allow-list of resource properties: Directory Service
MicrosoftAD/SimpleAD passwords, ElastiCache `AuthToken`, IAM `LoginProfile.Password`, the
Kinesis Firehose Redshift password, OpsWorks App/Stack passwords, and the RDS and Redshift
`MasterUserPassword`. `AWS::CloudFront::Distribution` is not on that list, so the literal
text `{{resolve:ssm-secure:...}}` would be forwarded to your origin as the header value.
Use a Secrets Manager reference instead.

**Note on `SecretValue`:** this property is a `string`, so a `SecretValue` cannot be passed
directly. Use `.unsafeUnwrap()`, not `.toString()` — `.toString()` returns a token rather
than throwing, but resolving it fails when the `@aws-cdk/core:checkSecretUsage` feature flag
is enabled.

**Note on visibility:** whichever mechanism you use, the resolved value is readable from the
CloudFront distribution configuration by anyone with `cloudfront:GetDistribution`. Dynamic
references keep the secret out of the template, not out of CloudFront.

**Rotation:** changing this value updates the CloudFront distribution, which takes about a
minute, while an origin's environment updates in seconds. Measured on a real deployment, that
left a 59-second window in which CloudFront still forwarded the old value. Make your origin
accept both the old and the new value across the deployment that changes it. See "Origin
Secret Stability and Rotation" in the README.

---

_Example_

```typescript
// A fixed literal value (simplest, but the secret lives in source control)
const protectedApi = new WafHttpApi(this, "MyApi", {
  httpApi: myHttpApi,
  secretHeaderValue: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
});
```

##### `wafRules`<sup>Optional</sup> <a name="wafRules" id="waf-http-api.WafHttpApiProps.property.wafRules"></a>

```typescript
public readonly wafRules: RuleProperty[];
```

- _Type:_ aws-cdk-lib.aws_wafv2.CfnWebACL.RuleProperty[]
- _Default:_ AWS Managed Rules (AmazonIpReputationList, CommonRuleSet)

Optional: Custom WAF rules to apply to the WebACL.

If not provided, a default set of AWS Managed Rules will be used,
specifically "AWSManagedRulesAmazonIpReputationList" and "AWSManagedRulesCommonRuleSet".
These rules help protect against common web exploits and unwanted traffic.

---

_Example_

```typescript
wafRules: [
  {
    name: "RateLimitRule",
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
      metricName: "RateLimitRule",
      sampledRequestsEnabled: true,
    },
  },
];
```

##### `webAclName`<sup>Optional</sup> <a name="webAclName" id="waf-http-api.WafHttpApiProps.property.webAclName"></a>

```typescript
public readonly webAclName: string;
```

- _Type:_ string
- _Default:_ unset, so CloudFormation generates `<stackName>-<logicalId>-<random>`

Optional: An explicit name for the AWS WAF WebACL.

By default the construct does not name the WebACL, so CloudFormation generates
`<stackName>-<logicalId>-<random>` — which already identifies the stack and this construct.
The CloudWatch metric name is set separately to `<stackName>-<constructId>-WebACL` and is
exposed as `webAclMetricName`.

Set this only if you need a specific name. It must match `^[0-9A-Za-z_-]{1,128}$` — letters,
digits, hyphens and underscores only — and cannot be `All` or `Default_Action`, which AWS WAF
reserves. It is also used as the CloudWatch metric name.

**Changing this value replaces the WebACL.** AWS WAF does not allow a rename, so
CloudFormation creates the replacement, re-associates the CloudFront distribution and deletes
the old one — measured at 78 seconds end to end, with no impact on traffic, because the old
WebACL stays associated until the new one takes over.

Note also that a CLOUDFRONT-scoped WebACL lives in `us-east-1` whatever region the stack
targets, so the name must be unique across every region you deploy this stack to.

---

_Example_

```typescript
const protectedApi = new WafHttpApi(this, "MyApi", {
  httpApi: myHttpApi,
  webAclName: "orders-api-production",
});
```
