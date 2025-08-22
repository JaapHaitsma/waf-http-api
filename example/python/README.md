# WAF HTTP API Python Example

This is a Python CDK example that demonstrates how to use the `waf-http-api` construct to create a WAF-protected HTTP API.

## Architecture

This example creates:

- **Lambda Function**: Python 3.12 runtime that returns a greeting with request information
- **HTTP API Gateway**: RESTful API with multiple routes (`/` and `/hello`)
- **WafHttpApi Construct**: Automatically creates CloudFront distribution and WAF WebACL
- **Origin Verification**: Secret header mechanism to ensure requests come through CloudFront

## Features

- ✅ **Python 3.12 Lambda Runtime**: Latest Python runtime for optimal performance
- ✅ **WafHttpApi Construct**: Uses the official `waf-http-api` package for simplified setup
- ✅ **Comprehensive Security**: WAF protection with IP reputation and common rule sets
- ✅ **Origin Verification**: CloudFront adds secret headers to verify legitimate requests
- ✅ **Multiple HTTP Methods**: Supports GET and POST requests
- ✅ **CORS Support**: Configured for cross-origin requests
- ✅ **Detailed Logging**: Request information and verification status
- ✅ **Infrastructure as Code**: Fully defined using AWS CDK Python

## Prerequisites

- Python 3.8 or later
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- AWS credentials configured

## Setup

1. **Create and activate virtual environment**:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate.bat
   ```

2. **Install dependencies**:

   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

   This will install:

   - `aws-cdk-lib`: AWS CDK core library
   - `constructs`: CDK constructs framework
   - `waf-http-api`: The WAF HTTP API construct package
   - `pytest`: Testing framework

## Usage

### Build and Test

```bash
# Run tests
pytest

# Synthesize CloudFormation template
cdk synth

# Deploy to AWS
cdk deploy

# Clean up resources
cdk destroy
```

### Testing the API

After deployment, you'll get several outputs:

- **CloudFrontUrl**: Use this endpoint for production traffic (recommended)
- **HttpApiUrl**: Direct API Gateway URL (not recommended for production)

```bash
# Test the API through CloudFront (recommended)
curl https://d1234567890.cloudfront.net/

# Test the hello endpoint
curl https://d1234567890.cloudfront.net/hello

# POST request
curl -X POST https://d1234567890.cloudfront.net/hello \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Project Structure

```
example/python/
├── app.py                              # CDK app entry point
├── waf_http_api_example/
│   ├── __init__.py
│   └── waf_http_api_example_stack.py   # Main stack definition
├── tests/
│   ├── __init__.py
│   └── test_waf_http_api_example.py    # Comprehensive test suite
├── requirements.txt                    # Runtime dependencies
├── requirements-dev.txt                # Development dependencies
├── cdk.json                           # CDK configuration
└── README.md                          # This file
```

## Key Components

### Lambda Function

- **Runtime**: Python 3.12
- **Handler**: Inline code that processes HTTP requests
- **Features**: Origin verification, detailed logging, CORS headers

### HTTP API Gateway

- **Type**: HTTP API (faster and cheaper than REST API)
- **Routes**: `GET /`, `GET /hello`, `POST /hello`
- **Integration**: Lambda proxy integration

### WafHttpApi Construct

- **Package**: `waf_http_api` from PyPI
- **Features**: Automatically creates and configures CloudFront and WAF
- **Configuration**: Simple API with sensible defaults
- **Extensibility**: Support for custom domains and WAF rules

### CloudFront Distribution (via WafHttpApi)

- **Caching**: Optimized for API responses
- **Security**: WAF integration for DDoS and application-layer protection
- **Origin**: HTTP API Gateway with custom verification headers

### WAF WebACL (via WafHttpApi)

- **Scope**: CloudFront (global)
- **Rules**:
  - AWS Managed IP Reputation List
  - AWS Managed Common Rule Set
- **Action**: Allow by default, block malicious traffic

## Security Features

1. **WAF Protection**: Blocks malicious requests before they reach your API
2. **Origin Verification**: Secret headers ensure requests come through CloudFront
3. **HTTPS Only**: All traffic redirected to HTTPS
4. **IP Reputation**: Automatic blocking of known malicious IP addresses
5. **Common Attack Protection**: OWASP Top 10 and common web vulnerabilities

## Monitoring and Observability

- **CloudWatch Logs**: Lambda function logs for debugging
- **WAF Metrics**: Request counts, blocked requests, rule matches
- **CloudFront Metrics**: Cache hit rates, origin response times
- **API Gateway Metrics**: Request counts, latency, error rates

## Cost Optimization

- **HTTP API**: More cost-effective than REST API
- **CloudFront**: Reduces origin load and improves performance
- **Lambda**: Pay-per-request pricing with efficient Python runtime
- **WAF**: Only pay for requests processed

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test
pytest tests/test_waf_http_api_example.py::TestWafHttpApiExampleStack::test_lambda_function_created_with_python_312
```

### Adding Custom WAF Rules

You can extend the WAF configuration by adding custom rules to the `web_acl` in the stack:

```python
# Add rate limiting rule
rate_limit_rule = wafv2.CfnWebACL.RuleProperty(
    name="RateLimitRule",
    priority=10,
    action=wafv2.CfnWebACL.RuleActionProperty(block={}),
    statement=wafv2.CfnWebACL.StatementProperty(
        rate_based_statement=wafv2.CfnWebACL.RateBasedStatementProperty(
            limit=2000,
            aggregate_key_type="IP"
        )
    ),
    visibility_config=wafv2.CfnWebACL.VisibilityConfigProperty(
        cloud_watch_metrics_enabled=True,
        metric_name="RateLimitRule",
        sampled_requests_enabled=True
    )
)
```

## Troubleshooting

### Common Issues

1. **403 Forbidden**: Check that requests are going through CloudFront, not directly to API Gateway
2. **Origin Verification Failed**: Ensure the secret header is properly configured
3. **WAF Blocking Legitimate Traffic**: Review WAF logs and adjust rules if needed

### Debugging

1. **Check Lambda Logs**: View CloudWatch logs for the Lambda function
2. **WAF Logs**: Enable WAF logging to S3 for detailed analysis
3. **CloudFront Logs**: Enable access logs for request analysis

## License

This example is provided under the same license as the main waf-http-api project.
