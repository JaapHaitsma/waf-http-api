import json
from aws_cdk import (
    Stack,
    CfnOutput,
    aws_lambda as _lambda,
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_integrations as integrations,
)
from constructs import Construct
from waf_http_api import WafHttpApi


class WafHttpApiExampleStack(Stack):
    """
    Python CDK Stack demonstrating WAF-protected HTTP API with CloudFront.

    This stack creates:
    - Lambda function with Python 3.12 runtime
    - HTTP API Gateway with multiple routes
    - WAF-protected CloudFront distribution using the WafHttpApi construct
    - Origin verification using secret headers
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create a Lambda function that returns a greeting
        hello_lambda = _lambda.Function(
            self, "HelloLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=_lambda.Code.from_inline("""
import json
import os
from datetime import datetime

def handler(event, context):
    print(f'Event: {json.dumps(event, indent=2)}')
    
    # Check for the CloudFront secret header for origin verification
    headers = event.get('headers', {})
    secret_header = headers.get('x-origin-verify')
    expected_secret = os.environ.get('CLOUDFRONT_SECRET')
    
    if secret_header and expected_secret and secret_header == expected_secret:
        print('✅ Request verified as coming from CloudFront')
        cloudfront_verified = True
    else:
        print('⚠️  Request may not be from CloudFront (missing or invalid secret header)')
        cloudfront_verified = False
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        'body': json.dumps({
            'message': 'Hello from waf-http-api Python CDK construct!!',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'requestId': event.get('requestContext', {}).get('requestId'),
            'sourceIp': event.get('requestContext', {}).get('http', {}).get('sourceIp'),
            'userAgent': headers.get('user-agent'),
            'cloudFrontVerified': cloudfront_verified
        }, indent=2)
    }
            """)
        )

        # Create the HTTP API Gateway
        http_api = apigwv2.HttpApi(
            self, "ExampleHttpApi",
            description="Example HTTP API protected by WAF and CloudFront",
            api_name="waf-http-api-python-example"
        )

        # Create Lambda integration
        lambda_integration = integrations.HttpLambdaIntegration(
            "HelloLambdaIntegration",
            hello_lambda
        )

        # Add routes to the HTTP API
        http_api.add_routes(
            path="/",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration
        )

        http_api.add_routes(
            path="/hello",
            methods=[apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
            integration=lambda_integration
        )

        # Create the WAF-protected HTTP API using our construct
        protected_api = WafHttpApi(
            self, "ProtectedApi",
            http_api=http_api
            # You can uncomment and configure these for custom domain support:
            # domain='api.example.com',
            # hosted_zone=HostedZone.from_lookup(self, 'MyZone',
            #     domain_name='example.com'
            # ),
            #
            # You can also add custom WAF rules:
            # waf_rules=[
            #     {
            #         'name': 'RateLimitRule',
            #         'priority': 10,
            #         'statement': {
            #             'rateBasedStatement': {
            #                 'limit': 2000,
            #                 'aggregateKeyType': 'IP',
            #             },
            #         },
            #         'action': {'block': {}},
            #         'visibilityConfig': {
            #             'cloudWatchMetricsEnabled': True,
            #             'metricName': 'RateLimitRule',
            #             'sampledRequestsEnabled': True,
            #         },
            #     },
            # ],
        )

        # Set the CloudFront secret as an environment variable for the Lambda
        hello_lambda.add_environment(
            "CLOUDFRONT_SECRET",
            protected_api.secret_header_value
        )

        # Store references for outputs and tests
        self.http_api = http_api
        self.protected_api = protected_api
        self.hello_lambda = hello_lambda

        # Output the important endpoints and information
        CfnOutput(
            self, "HttpApiUrl",
            value=http_api.url,
            description="Direct HTTP API URL (not recommended for production use!)"
        )

        CfnOutput(
            self, "CloudFrontUrl",
            value=f"https://{protected_api.distribution.distribution_domain_name}",
            description="CloudFront distribution URL (recommended endpoint)"
        )

        CfnOutput(
            self, "CloudFrontDistributionId",
            value=protected_api.distribution.distribution_id,
            description="CloudFront distribution ID"
        )

        CfnOutput(
            self, "SecretHeaderName",
            value=WafHttpApi.SECRET_HEADER_NAME,
            description="Name of the secret header added by CloudFront"
        )

        CfnOutput(
            self, "SecretHeaderValue",
            value=protected_api.secret_header_value,
            description="Value of the secret header (for origin verification)"
        )

        # If custom domain is configured, output it
        if hasattr(protected_api, 'custom_domain') and protected_api.custom_domain:
            CfnOutput(
                self, "CustomDomainUrl",
                value=f"https://{protected_api.custom_domain}",
                description="Custom domain URL"
            )
