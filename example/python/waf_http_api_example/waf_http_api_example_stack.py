import json
from aws_cdk import (
    Stack,
    CfnOutput,
    aws_lambda as _lambda,
    aws_apigatewayv2 as apigwv2,
    aws_apigatewayv2_integrations as integrations,
    aws_apigatewayv2_authorizers as authorizers,
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
            'userAgent': event.get('headers', {}).get('user-agent'),
        }, indent=2)
    }
            """)
        )

        # Create a Lambda authorizer that validates the secret header
        authorizer_lambda = _lambda.Function(
            self,
            "AuthorizerLambda",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="index.handler",
            code=_lambda.Code.from_inline(
                """
import os

def handler(event, context):
    try:
        headers = (event or {}).get('headers', {}) or {}
        identity_list = (event or {}).get('identitySource') or []
        identity = identity_list[0] if isinstance(identity_list, list) and identity_list else None
        provided = identity or headers.get('x-origin-verify') or headers.get('X-Origin-Verify')
        expected = os.environ.get('CLOUDFRONT_SECRET')
        ok = bool(provided) and bool(expected) and provided == expected
        return { 'isAuthorized': ok }
    except Exception as e:
        print('Authorizer error:', e)
        return { 'isAuthorized': False }
                """
            ),
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

        # Lambda authorizer configured for SIMPLE responses
        lambda_authorizer = authorizers.HttpLambdaAuthorizer(
            "OriginHeaderAuthorizer",
            authorizer_lambda,
            response_types=[authorizers.HttpLambdaResponseType.SIMPLE],
            identity_source=["$request.header.x-origin-verify"],
        )

        # Add routes to the HTTP API
        http_api.add_routes(
            path="/",
            methods=[apigwv2.HttpMethod.GET],
            integration=lambda_integration,
            authorizer=lambda_authorizer,
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

        # Provide the CloudFront secret to the authorizer
        authorizer_lambda.add_environment(
            "CLOUDFRONT_SECRET",
            protected_api.secret_header_value
        )

        # Store references for outputs and tests
        self.http_api = http_api
        self.protected_api = protected_api
        self.hello_lambda = hello_lambda

        # Output the important endpoints and information
        CfnOutput(
            self, "CloudFrontUrl",
            value=f"https://{protected_api.distribution.distribution_domain_name}",
            description="CloudFront distribution URL (recommended endpoint)"
        )

        CfnOutput(
            self, "HttpApiUrl",
            value=http_api.url,
            description="Direct HTTP API URL (blocked by authorizer)"
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
