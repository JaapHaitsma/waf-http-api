# WAF HTTP API

A CDK construct that fronts an HTTP API with a CloudFront distribution and protects it with AWS WAF.

## Features

- **Enhanced Security:** Protects your HTTP API with AWS WAF rules
- **Global CDN:** Fronts your API with CloudFront for improved performance and availability
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
pip install merapar.waf-http-api
```

## Usage

This example shows how to protect an HTTP API with WAF and CloudFront:

```typescript
import { Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { WafHttpApi } from 'waf-http-api';

class MyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const myLambda = new NodejsFunction(this, 'MyApiHandler', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'handler',
      entry: 'lambda/handler.ts',
    });

    const httpApi = new HttpApi(this, 'MyHttpApi', {
      description: 'My example HTTP API',
    });

    httpApi.addRoutes({
      path: '/hello',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('MyLambdaIntegration', myLambda),
    });

    const protectedApi = new WafHttpApi(this, 'ProtectedMyApi', {
      httpApi: httpApi,
      // Optionally, provide custom WAF rules:
      // wafRules: [ ... ],
    });

    new cdk.CfnOutput(this, 'ProtectedApiEndpoint', {
      value: protectedApi.distribution.distributionDomainName,
      description: 'The CloudFront URL for the protected API endpoint',
    });

    new cdk.CfnOutput(this, 'OriginVerificationSecret', {
      value: protectedApi.secretHeaderValue,
      description: 'Secret value to verify CloudFront origin requests',
    });
  }
}
```

## API

See [`API.md`](API.md) for full API documentation.

## Development

This project uses [projen](https://github.com/projen/projen) for project management. To synthesize project files after making changes to `.projenrc.ts`, run:

```bash
npx projen
```

## License

MIT © Merapar Technologies Group B.V.