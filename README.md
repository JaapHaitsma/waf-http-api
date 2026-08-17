# WAF HTTP API

A CDK construct that fronts an HTTP API with a CloudFront distribution and protects it with AWS WAF.

[![npm version](https://badge.fury.io/js/waf-http-api.svg)](https://badge.fury.io/js/waf-http-api)
[![PyPI version](https://badge.fury.io/py/waf-http-api.svg)](https://badge.fury.io/py/waf-http-api)

## Features

- **Enhanced Security:** Protects your HTTP API with AWS WAF rules
- **Global CDN:** Fronts your API with CloudFront for improved performance and availability
- **Custom Domains:** Support for custom domains with automatic SSL certificate management (requires hosted zone for DNS validation)
- **Automatic DNS Records:** Automatically creates Route 53 A and AAAA records for custom domains
- **Origin Verification:** Adds a secret header to ensure requests come through CloudFront, backed by a construct-managed AWS Secrets Manager secret so deployments stay deterministic
- **Customizable:** Use default WAF rules or provide your own custom rules
- **Easy Integration:** Simple to add to existing AWS CDK stacks

## Installation

### TypeScript/JavaScript

```bash
npm install waf-http-api
```

### Python

```bash
pip install waf-http-api
```

## Examples

Complete working examples demonstrating the usage of `waf-http-api` can be found in the [`example/`](./example/) directory:

- **[TypeScript Example](./example/typescript/)**: Full CDK application with Node.js 22 Lambda, comprehensive tests, and deployment scripts
- **[Python Example](./example/python/)**: Complete CDK application with Python 3.12 Lambda, pytest test suite, and development tools

Both examples include:

- ✅ Complete CDK stacks using the `WafHttpApi` construct
- ✅ Lambda functions with origin verification
- ✅ HTTP API Gateway with multiple routes
- ✅ Comprehensive test suites
- ✅ Build and deployment scripts
- ✅ Detailed documentation

These examples serve as practical references for implementing WAF-protected HTTP APIs in production environments.

## Usage

### Basic Usage

This example shows how to protect an HTTP API with WAF and CloudFront:

```typescript
import { Stack, StackProps } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { WafHttpApi } from "waf-http-api";

class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const myLambda = new NodejsFunction(this, "MyApiHandler", {
      handler: "handler",
      entry: "lambda/handler.ts",
    });

    const httpApi = new HttpApi(this, "MyHttpApi", {
      description: "My example HTTP API",
    });

    httpApi.addRoutes({
      path: "/hello",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration("MyLambdaIntegration", myLambda),
    });

    const protectedApi = new WafHttpApi(this, "ProtectedMyApi", {
      httpApi: httpApi,
      // Optionally, provide custom WAF rules:
      // wafRules: [ ... ],
    });

    new cdk.CfnOutput(this, "ProtectedApiEndpoint", {
      value: protectedApi.distribution.distributionDomainName,
      description: "The CloudFront URL for the protected API endpoint",
    });

    // Hand the origin verification secret to your backend so it can reject requests
    // that did not come through CloudFront.
    //
    // Do NOT publish it with CfnOutput: by default this is a CloudFormation dynamic
    // reference, which is only resolved in resource properties — a stack output would
    // emit the literal `{{resolve:...}}` text. Stack outputs also have no `noEcho`,
    // are returned by `cloudformation:DescribeStacks`, and are printed on `cdk deploy`.
    myLambda.addEnvironment(
      "CLOUDFRONT_SECRET",
      protectedApi.secretHeaderValue,
    );
  }
}
```

### Custom Domain with Automatic Certificate

This example shows how to use a custom domain with automatic SSL certificate generation:

```typescript
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { WafHttpApi } from "waf-http-api";

class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ... Lambda and HTTP API setup (same as above) ...

    const protectedApi = new WafHttpApi(this, "ProtectedMyApi", {
      httpApi: httpApi,
      domain: "api.example.com", // Custom domain
      // Certificate will be automatically generated with DNS validation
    });

    new CfnOutput(this, "CustomDomainEndpoint", {
      value: `https://${protectedApi.customDomain}`,
      description: "Custom domain API endpoint",
    });

    new CfnOutput(this, "CertificateArn", {
      value: protectedApi.certificate?.certificateArn || "No certificate",
      description: "Auto-generated SSL certificate ARN",
    });
  }
}
```

### Custom Domain Configuration

**Important:** When using a custom domain, you must provide a hosted zone for DNS validation and automatic record creation.

```typescript
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { WafHttpApi } from "waf-http-api";

class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ... Lambda and HTTP API setup (same as above) ...

    // Reference an existing hosted zone (REQUIRED for custom domains)
    const hostedZone = HostedZone.fromLookup(this, "MyZone", {
      domainName: "example.com",
    });

    const protectedApi = new WafHttpApi(this, "ProtectedMyApi", {
      httpApi: httpApi,
      domain: "api.example.com",
      hostedZone: hostedZone, // REQUIRED when using custom domain
    });

    new CfnOutput(this, "CustomDomainEndpoint", {
      value: `https://${protectedApi.customDomain}`,
      description: "Custom domain API endpoint",
    });

    // Access the automatically created DNS records
    if (protectedApi.aRecord) {
      new CfnOutput(this, "ARecordName", {
        value: protectedApi.aRecord.domainName,
        description: "A record for the API domain",
      });
    }

    if (protectedApi.aaaaRecord) {
      new CfnOutput(this, "AAAARecordName", {
        value: protectedApi.aaaaRecord.domainName,
        description: "AAAA record for the API domain",
      });
    }
  }
}
```

### Custom Domain with Provided Certificate

This example shows how to use a custom domain with your own SSL certificate (hosted zone still required):

```typescript
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { WafHttpApi } from "waf-http-api";

class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ... Lambda and HTTP API setup (same as above) ...

    // Reference an existing hosted zone (REQUIRED)
    const hostedZone = HostedZone.fromLookup(this, "MyZone", {
      domainName: "example.com",
    });

    // Reference an existing certificate (must be in us-east-1 region)
    const existingCertificate = Certificate.fromCertificateArn(
      this,
      "ExistingCert",
      "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
    );

    const protectedApi = new WafHttpApi(this, "ProtectedMyApi", {
      httpApi: httpApi,
      domain: "api.example.com",
      hostedZone: hostedZone, // REQUIRED when using custom domain
      certificate: existingCertificate, // Use provided certificate
    });

    new CfnOutput(this, "CustomDomainEndpoint", {
      value: `https://${protectedApi.customDomain}`,
      description: "Custom domain API endpoint",
    });

    new CfnOutput(this, "CertificateArn", {
      value: protectedApi.certificate?.certificateArn || "No certificate",
      description: "Provided SSL certificate ARN",
    });
  }
}
```

### Advanced Configuration with Custom WAF Rules

This example shows advanced usage with custom domain and custom WAF rules:

```typescript
import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { WafHttpApi } from "waf-http-api";

class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ... Lambda and HTTP API setup (same as above) ...

    // Reference an existing hosted zone (REQUIRED for custom domains)
    const hostedZone = HostedZone.fromLookup(this, "MyZone", {
      domainName: "example.com",
    });

    const protectedApi = new WafHttpApi(this, "ProtectedMyApi", {
      httpApi: httpApi,
      domain: "secure-api.example.com",
      hostedZone: hostedZone, // REQUIRED when using custom domain
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
        // Add more custom rules as needed
      ],
    });

    new CfnOutput(this, "SecureApiEndpoint", {
      value: `https://${protectedApi.customDomain}`,
      description: "Secure API endpoint with custom WAF rules",
    });
  }
}
```

### Bringing Your Own Origin Verification Secret

By default the construct creates and manages the origin verification secret for you. Supply
`secretHeaderValue` when you want to own its lifecycle instead — for example when the same secret is
shared with a system outside this stack:

```typescript
import { SecretValue } from "aws-cdk-lib";

const protectedApi = new WafHttpApi(this, "ProtectedMyApi", {
  httpApi: httpApi,
  // Resolved by CloudFormation at deploy time; the plaintext never enters the template
  secretHeaderValue: SecretValue.secretsManager(
    "prod/api/origin-verify",
  ).unsafeUnwrap(),
});

// The same value must reach your backend, so both sides agree
authorizerLambda.addEnvironment(
  "CLOUDFRONT_SECRET",
  protectedApi.secretHeaderValue,
);
```

## Important Notes

### Origin Secret Stability and Rotation

CloudFront sends a secret header (`X-Origin-Verify`, exposed as `WafHttpApi.SECRET_HEADER_NAME`) to
the origin so the origin can reject requests that bypassed CloudFront. There are two ways to source
it:

| Configuration            | What lands in the template                         | `secretHeaderValue` is | Cost         |
| ------------------------ | -------------------------------------------------- | ---------------------- | ------------ |
| _default_                | `{{resolve:secretsmanager:<Ref>:SecretString:::}}` | a deploy-time token    | ~$0.40/month |
| `secretHeaderValue: '…'` | whatever you supplied                              | that value             | none         |

Both are deterministic: two synthesises of identical code produce identical templates.

**The default is a token, not a string.** CloudFormation resolves it during deployment, which means:

- ✅ Works: passing it into any resource property — a Lambda environment variable, another
  construct's props, a string template interpolated into a resource property.
- ❌ Does not work: `CfnOutput`, `.length`, `.substring()`, or comparing it to anything at synthesis
  time. Dynamic references are resolved in resource properties only, so a stack output would emit
  the literal `{{resolve:...}}` text.

Use `originSecret` if you would rather the backend read the value at runtime than receive it as a
plaintext environment variable:

```typescript
if (protectedApi.originSecret) {
  protectedApi.originSecret.grantRead(authorizerLambda);
  authorizerLambda.addEnvironment(
    "ORIGIN_SECRET_ARN",
    protectedApi.originSecret.secretArn,
  );
}
```

**Why this matters.** In v1 the value was generated at synthesis time, so two synthesises of
identical code produced different templates. There is deliberately no way to opt back into that,
because it has two costs:

- `cdk diff` is never clean. The distribution's `OriginCustomHeaders` changes on every deployment,
  and so does every resource consuming `secretHeaderValue`.
- CloudFormation updates independent resources **in parallel**. A Lambda environment variable update
  lands in seconds; a CloudFront distribution update takes about a minute, and CloudFormation blocks
  until it reaches `Deployed`. In between, edge locations still forward the previous secret to an
  origin that already expects the new one, so requests are rejected with HTTP 401/403. The same
  window opens on rollback.

Measured on a real deployment that rotated the secret: the Lambda reached `UPDATE_COMPLETE` 8
seconds in, the distribution 67 seconds in — a **59-second window** in which CloudFront forwarded a
secret the origin would reject.

Both of those apply to any change of the secret, which is why rotation needs the procedure below.

**Two operational notes** that apply to either mode:

- CloudFormation resolves the dynamic reference using the **stack's execution role**, which therefore
  needs `secretsmanager:GetSecretValue` on the secret. This is satisfied by the default CDK
  bootstrap; check it if you use a restricted bootstrap or a permissions boundary.
- The resolved secret is readable from the CloudFront distribution configuration by anyone holding
  `cloudfront:GetDistribution`. Dynamic references keep the secret out of the CloudFormation
  template, not out of CloudFront.

#### Rotating the secret safely

Changing the secret changes the CloudFront distribution, and that update runs in parallel with the
origin's update. If the origin starts requiring the new value before the distribution has finished
deploying, requests are rejected — the same window as above, just triggered deliberately. Rotate in
three deployments:

1. **Accept both.** Change the origin to accept either the current secret or the next one (for
   example `CLOUDFRONT_SECRET` plus `CLOUDFRONT_SECRET_NEXT`). Leave the secret itself unchanged.
2. **Switch CloudFront.** Change the value, then wait for the distribution to finish deploying:
   `aws cloudfront wait distribution-deployed --id <distribution-id>`.
3. **Drop the old value.** Remove the previous secret from the origin's accepted set.

Note that rotating a Secrets Manager secret **on its own does not update the distribution**:
CloudFormation re-resolves a dynamic reference only for resources it actually updates during a stack
operation, and an otherwise unchanged distribution is not updated. Roll the value through a stack
deployment using the steps above rather than relying on automatic secret rotation. The alternative
that avoids the window entirely is to `grantRead` on `originSecret` and have the origin fetch the
value at runtime, accepting both `AWSCURRENT` and `AWSPREVIOUS`.

> **A cached authorizer will hide this window in testing.** If your origin check sits behind an API
> Gateway Lambda authorizer, API Gateway caches the result keyed on the identity source — the
> `X-Origin-Verify` value itself — for `AuthorizerResultTtlInSeconds`, 5 minutes by default. During
> the window CloudFront keeps sending the _old_ value, which is already cached as "allow", so the
> updated authorizer is never invoked and no request fails.
>
> This was observed on a real rotation: a 59-second mismatch produced **zero** failed requests, yet
> the same old secret returned `403` the moment its cache entry expired. The window was real
> throughout; nothing looked at it.
>
> So a rotation that appears clean against a cached authorizer can still break an origin that checks
> the header **inside the handler**, where every request is evaluated against the current value. Do
> not skip the dual-accept step on the strength of a clean test — verify with caching disabled, or
> assume the window is there.

### Upgrading from v1 to v2

In v1 the origin verification secret was generated at synthesis time on every run. v2 makes the
construct create and manage a Secrets Manager secret instead, which is what makes deployments
deterministic.

**What breaks.** `secretHeaderValue` is no longer a resolved string by default. The change compiles
cleanly, so check your stacks for uses that are not resource properties:

```bash
rg 'secretHeaderValue|secret_header_value' --type ts --type py
```

- `lambda.addEnvironment('SECRET', api.secretHeaderValue)` — still fine, no change needed.
- `new CfnOutput(this, 'Secret', { value: api.secretHeaderValue })` — **remove it.** It now emits the
  literal `{{resolve:...}}` text instead of the secret.
- `api.secretHeaderValue.length`, `.substring()`, comparisons in tests — these now operate on a
  token placeholder. Assert on the synthesized template instead.

**If you want `secretHeaderValue` to stay a plain resolved string**, supply it yourself. That keeps
the value inspectable, creates no Secrets Manager resource, and is still deterministic:

```typescript
const protectedApi = new WafHttpApi(this, "ProtectedMyApi", {
  httpApi: httpApi,
  secretHeaderValue: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
});
```

There is deliberately no way to opt back into the v1 per-synth random value — that behaviour is the
bug this release fixes.

**Cost.** The managed secret is an AWS Secrets Manager secret, roughly $0.40 per month per construct
instance, plus API call charges. Supplying `secretHeaderValue` creates no resources and costs
nothing, which is the option to reach for in short-lived preview stacks.

**The WebACL is replaced, and its CloudWatch metric name changes.** v1 left the WebACL unnamed and
used the metric name `<constructId>-Waf`, which collided whenever two stacks reused a construct id.
v2 names both `<stackName>-<constructId>-WebACL`. AWS WAF cannot rename a WebACL, so CloudFormation
creates a replacement, re-associates the distribution and deletes the old one — measured at 78
seconds, with no failed requests, because the WebACL's value never changes. Two consequences:

- **Any dashboards or alarms referencing the old `<constructId>-Waf` metric stop reporting.**
  Repoint them at `protectedApi.webAclMetricName`.
- If you had `Retain` set on the WebACL, the old one is left behind and still bills.

The distribution's comment changes too, in place. The Secrets Manager secret is new in v2 — v1
created no such resource — so nothing is replaced there.

**Plan the upgrade deployment.** The one disruptive part is the header value, which changes from the
v1 per-synth random string to the managed secret, so the upgrade carries one rejection window.

**You can avoid that window entirely** by pinning the secret to the value that is already deployed,
so the header does not change at all. Read it off the live distribution:

```bash
aws cloudfront get-distribution-config --id <distribution-id> \
  --query 'DistributionConfig.Origins.Items[0].CustomHeaders.Items[0].HeaderValue'
```

then pass it on the first v2 deployment:

```typescript
const protectedApi = new WafHttpApi(this, "ProtectedMyApi", {
  httpApi: httpApi,
  secretHeaderValue: SecretValue.secretsManager(
    "prod/api/origin-verify",
  ).unsafeUnwrap(),
});
```

The distribution's `OriginCustomHeaders` is unchanged, so CloudFormation does not update the
distribution and there is no mismatch — and synthesis is already deterministic, which is the point
of upgrading. Moving to the construct-managed secret then becomes a separate, deliberate rotation
you can schedule using the three-deployment procedure above.

Otherwise, deploy in a maintenance window, or run that rotation with the origin accepting both
values across the change.

### Telling Multiple Deployments Apart

When several WAF-protected APIs live in one AWS account, each resource is identifiable as belonging
to the construct that created it. For `new WafHttpApi(this, "Jaap", …)` in a stack named `AppStack`:

| Resource                                   | Identifier                                                |
| ------------------------------------------ | --------------------------------------------------------- |
| WAF WebACL                                 | name **and** CloudWatch metric `AppStack-Jaap-WebACL`     |
| Secrets Manager secret                     | name `AppStack-Jaap-VerificationSecret`                   |
| — its description                          | `CloudFront origin verification secret for AppStack/Jaap` |
| CloudFront distribution                    | comment `AppStack-Jaap-Cloudfront` — see below            |
| ACM certificate _(only when `domain` set)_ | listed by domain                                          |
| Route 53 A / AAAA records                  | the domain itself, e.g. `api.example.com.`                |

**Do not assume CloudFormation's generated names carry the stack name.** For some resource types
they do; for these they do not. Left unnamed, a WebACL in a stack called `AppStack` deploys as
`JaapWebAclAB38EB29-Iqnds2cWntwI` — construct id plus a random suffix, no stack name — so the AWS
WAF console cannot tell you which stack it belongs to. That is why the construct names it.

Naming the WebACL is safe because `name` and `scope` are the only two properties of
`AWS::WAFv2::WebACL` that require replacement, and this construct hard-codes `scope`. A replacement
can therefore only be triggered by the name itself changing, in which case the old and new names
differ and cannot collide. One constraint to know: a CLOUDFRONT-scoped WebACL lives in `us-east-1`
whatever region the stack targets, so **the same stack name deployed to more than one region
collides** and the second deployment fails with "already exists". Give each region its own stack
name — `AppStack-euw1`, `AppStack-use1` — which is normal practice for multi-region apps and also
makes every other resource distinguishable.

Two more identifiers CloudFormation cannot generate at all, so the construct sets them:

- **The WebACL's CloudWatch metric name**, a required property with no default. It is set to the
  same string as the name, which also settles any ambiguity about which of the two drives the
  CloudWatch `WebACL` dimension. Use `webAclMetricName` rather than hard-coding it.
- **The CloudFront distribution's comment.** A distribution has no name property at all; AWS
  identifies it by generated ID and domain name. `Comment` is the only human-readable field, and
  the console shows it in the **Description** column.

The Secrets Manager secret is named on the same basis. `Name` is likewise its only
replacement-triggering property, and it is regional, so it carries none of the cross-region
constraint above. Naming it is safe to delete and recreate because the removal policy is `DESTROY`,
which CloudFormation applies with `ForceDeleteWithoutRecovery` — so no recovery window survives to
collide with the name.

Every taggable resource is also tagged with the construct's path. This is the most reliable
attribution — it updates in place, never collides, and reaches resources that cannot be named at
all, such as the auto-generated certificate. It also works in Resource Groups and Cost Explorer:

```
waf-http-api:construct = AppStack/Jaap
```

Build alarms off `webAclMetricName` rather than hard-coding it:

```typescript
new Metric({
  namespace: "AWS/WAFV2",
  metricName: "BlockedRequests",
  dimensionsMap: {
    WebACL: protectedApi.webAclMetricName,
    Rule: "ALL",
    Region: "global",
  },
});
```

The name is not configurable. A caller-chosen name would forfeit CloudFormation's ability to
replace the resource — a custom-named resource cannot be replaced in place — and could collide in
the global `us-east-1` namespace that all CLOUDFRONT-scoped WebACLs share. The derived name is
unique per stack and construct id, so neither can happen.

Inside a `NestedStack` the stack name is only known at deployment time, so the WebACL name is left
to CloudFormation, the metric name falls back to `<constructId>-Waf`, and the distribution comment
to a form based on the API id.

Your own stack-level tags are propagated alongside the construct's:

```typescript
Tags.of(this).add("Application", "orders");
```

### Certificate Requirements

- **Region Requirement**: SSL certificates for CloudFront must be in the `us-east-1` region
- **DNS Validation**: Auto-generated certificates use DNS validation through the provided hosted zone
- **Domain Ownership**: You must own and control the domain and have access to the hosted zone

### Domain Configuration

- **Supported Formats**: Apex domains (`example.com`), subdomains (`api.example.com`), and wildcards (`*.example.com`)
- **Hosted Zone Required**: All custom domains require a corresponding hosted zone for DNS validation and record creation
- **Automatic DNS Setup**: DNS records are automatically created in the provided hosted zone
- **Validation**: Domain format and hosted zone compatibility are validated at synthesis time

### Hosted Zone Requirements

- **Required for Custom Domains**: A hosted zone is required when using custom domains for DNS validation and record creation
- **Automatic DNS Records**: Route 53 A and AAAA records are automatically created for the custom domain
- **Domain Compatibility**: The domain must match or be a subdomain of the hosted zone's domain
- **Record Types**: Both IPv4 (A) and IPv6 (AAAA) records are created pointing to the CloudFront distribution

## API

See [`API.md`](API.md) for full API documentation.

## Development

First run

```bash
yarn install
```

This project uses [projen](https://github.com/projen/projen) for project management. To synthesize project files after making changes to `.projenrc.ts`, run:

```bash
npx projen
```

## License

MIT © Merapar Technologies Group B.V.
