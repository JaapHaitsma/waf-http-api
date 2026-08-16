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
  lands in seconds; a CloudFront distribution update takes minutes, and CloudFormation blocks until
  it reaches `Deployed`. In between, edge locations still forward the previous secret to an origin
  that already expects the new one, so requests are rejected with HTTP 401/403. The same window
  opens on rollback.

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

**Plan the upgrade deployment.** Moving from v1 to v2 changes the header value, so the upgrade itself
carries one rejection window. Deploy it in a maintenance window, or run the three-deployment rotation
above with the origin accepting both values across the change.

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
