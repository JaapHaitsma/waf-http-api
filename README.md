# WAF HTTP API

A CDK construct that fronts an HTTP API with a CloudFront distribution and protects it with AWS WAF.

## Features

- **Enhanced Security:** Protects your HTTP API with AWS WAF rules
- **Global CDN:** Fronts your API with CloudFront for improved performance and availability
- **Custom Domains:** Support for custom domains with automatic SSL certificate management (requires hosted zone for DNS validation)
- **Automatic DNS Records:** Automatically creates Route 53 A and AAAA records for custom domains
- **Origin Verification:** Adds a secret header to ensure requests come through CloudFront
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
      runtime: Runtime.NODEJS_18_X,
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

    new cdk.CfnOutput(this, "OriginVerificationSecret", {
      value: protectedApi.secretHeaderValue,
      description: "Secret value to verify CloudFront origin requests",
    });
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

## Breaking Changes

### Version 2.x - Hosted Zone Required for Custom Domains

**⚠️ Breaking Change:** Starting from version 2.x, a hosted zone is required when using custom domains.

**Before (v1.x):**

```typescript
// This worked in v1.x but will fail in v2.x
const protectedApi = new WafHttpApi(this, "MyApi", {
  httpApi: httpApi,
  domain: "api.example.com", // No hosted zone required
});
```

**After (v2.x):**

```typescript
// v2.x requires hosted zone for custom domains
const hostedZone = HostedZone.fromLookup(this, "MyZone", {
  domainName: "example.com",
});

const protectedApi = new WafHttpApi(this, "MyApi", {
  httpApi: httpApi,
  domain: "api.example.com",
  hostedZone: hostedZone, // Now required
});
```

**Migration Guide:**

1. Add a hosted zone reference to your stack
2. Ensure your domain matches or is a subdomain of the hosted zone
3. Update your WafHttpApi configuration to include the `hostedZone` property

## Important Notes

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

This project uses [projen](https://github.com/projen/projen) for project management. To synthesize project files after making changes to `.projenrc.ts`, run:

```bash
npx projen
```

## License

MIT © Merapar Technologies Group B.V.
