# WAF HTTP API Example

This example demonstrates how to use the `waf-http-api` CDK construct to create a secure, WAF-protected HTTP API with CloudFront distribution.

## What This Example Creates

This CDK application creates:

1. **Lambda Function**: A simple Node.js function that returns a greeting message
2. **HTTP API Gateway**: An AWS API Gateway HTTP API that routes requests to the Lambda
3. **WAF-Protected CloudFront Distribution**: Using the `waf-http-api` construct to:
   - Front the HTTP API with CloudFront for global distribution and caching
   - Protect the API with AWS WAF using managed rules
   - Add origin verification through a secret header
   - Provide enhanced security and performance

## Architecture

```
Internet → CloudFront (with WAF) → HTTP API Gateway → Lambda Function
```

The `waf-http-api` construct automatically:

- Creates a CloudFront distribution in front of your HTTP API
- Configures AWS WAF with managed rules to protect against common threats
- Adds a secret header for origin verification
- Handles all the complex networking and security configurations

## Prerequisites

- AWS CLI configured with appropriate credentials
- Node.js 18+ installed
- AWS CDK CLI installed (`npm install -g aws-cdk`)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (if not done before)

```bash
npx cdk bootstrap
```

### 3. Deploy the Stack

```bash
npx cdk deploy
```

The deployment will output several important URLs and values:

- **CloudFrontUrl**: The main endpoint you should use (protected by WAF)
- **HttpApiUrl**: Direct API Gateway URL (not recommended for production)
- **SecretHeaderValue**: Used for origin verification in your Lambda

### 4. Test the API

Once deployed, you can test the API using the CloudFront URL:

```bash
# Test the root endpoint
curl https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/

# Test the hello endpoint
curl https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/hello

# Test with POST
curl -X POST https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

## Key Features Demonstrated

### 1. Origin Verification

The Lambda function checks for the CloudFront secret header to verify requests are coming through CloudFront:

```typescript
const secretHeader = event.headers["x-origin-verify"];
const expectedSecret = process.env.CLOUDFRONT_SECRET;

if (secretHeader === expectedSecret) {
  console.log("✅ Request verified as coming from CloudFront");
}
```

### 2. WAF Protection

The construct automatically applies AWS managed WAF rules:

- `AWSManagedRulesAmazonIpReputationList`: Blocks requests from known malicious IPs
- `AWSManagedRulesCommonRuleSet`: Protects against common web exploits

### 3. CloudFront Benefits

- Global edge locations for reduced latency
- DDoS protection
- SSL/TLS termination
- Caching capabilities

## Customization Options

### Custom Domain Support

To use a custom domain, uncomment and configure the domain settings in `lib/typescript-stack.ts`:

```typescript
const protectedApi = new WafHttpApi(this, "ProtectedApi", {
  httpApi: httpApi,
  domain: "api.example.com",
  hostedZone: HostedZone.fromLookup(this, "MyZone", {
    domainName: "example.com",
  }),
});
```

### Custom WAF Rules

Add custom WAF rules for additional protection:

```typescript
const protectedApi = new WafHttpApi(this, "ProtectedApi", {
  httpApi: httpApi,
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
  ],
});
```

## Project Structure

```
├── bin/
│   └── cdk.ts           # CDK app entry point
├── lib/
│   └── typescript-stack.ts  # Main stack definition
├── test/
│   └── typescript.test.ts   # Unit tests
├── cdk.json             # CDK configuration
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## Available Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and compile
- `npm run test` - Run unit tests
- `npx cdk deploy` - Deploy this stack to your default AWS account/region
- `npx cdk diff` - Compare deployed stack with current state
- `npx cdk synth` - Emit the synthesized CloudFormation template
- `npx cdk destroy` - Remove the stack from AWS

## Security Considerations

1. **Use CloudFront URL**: Always use the CloudFront distribution URL, not the direct API Gateway URL
2. **Origin Verification**: The Lambda function demonstrates how to verify requests come from CloudFront
3. **WAF Rules**: The default managed rules provide good baseline protection
4. **HTTPS Only**: All traffic is encrypted in transit
5. **Custom Domain**: Consider using a custom domain with proper SSL certificates for production

## Monitoring and Observability

The stack creates CloudWatch metrics for:

- WAF rule matches and blocks
- CloudFront request metrics
- Lambda function performance
- API Gateway metrics

Check the AWS Console for:

- **CloudWatch**: Metrics and logs
- **WAF Console**: Rule matches and blocked requests
- **CloudFront Console**: Distribution statistics

## Cleanup

To remove all resources:

```bash
npx cdk destroy
```

## Learn More

- [waf-http-api Construct Documentation](../../README.md)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
- [Amazon CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)

## Troubleshooting

### Common Issues

1. **Bootstrap Error**: Run `npx cdk bootstrap` if you haven't used CDK in this region before
2. **Permission Errors**: Ensure your AWS credentials have sufficient permissions
3. **Domain Issues**: Custom domains require Route 53 hosted zones and proper DNS configuration
4. **Certificate Issues**: SSL certificates for CloudFront must be in the us-east-1 region

### Getting Help

- Check CloudFormation events in the AWS Console
- Review CloudWatch logs for Lambda function errors
- Use `npx cdk diff` to see what changes will be made before deployment
