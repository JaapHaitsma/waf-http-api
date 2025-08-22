import aws_cdk as core
import aws_cdk.assertions as assertions
import pytest

from waf_http_api_example.waf_http_api_example_stack import WafHttpApiExampleStack


class TestWafHttpApiExampleStack:
    """Test suite for the WAF HTTP API Example Stack."""

    @pytest.fixture
    def stack(self):
        """Create a test stack instance."""
        app = core.App()
        stack = WafHttpApiExampleStack(app, "TestStack")
        return stack

    @pytest.fixture
    def template(self, stack):
        """Create a CloudFormation template from the stack."""
        return assertions.Template.from_stack(stack)

    def test_lambda_function_created_with_python_312(self, template):
        """Test that Lambda function is created with Python 3.12 runtime."""
        template.has_resource_properties("AWS::Lambda::Function", {
            "Runtime": "python3.12",
            "Handler": "index.handler"
        })

    def test_http_api_gateway_created(self, template):
        """Test that HTTP API Gateway is created with correct configuration."""
        template.has_resource_properties("AWS::ApiGatewayV2::Api", {
            "ProtocolType": "HTTP",
            "Name": "waf-http-api-python-example",
            "Description": "Example HTTP API protected by WAF and CloudFront"
        })

    def test_api_gateway_routes_created(self, template):
        """Test that API Gateway routes are created."""
        # Test GET / route
        template.has_resource_properties("AWS::ApiGatewayV2::Route", {
            "RouteKey": "GET /"
        })

        # Test GET /hello route
        template.has_resource_properties("AWS::ApiGatewayV2::Route", {
            "RouteKey": "GET /hello"
        })

        # Test POST /hello route
        template.has_resource_properties("AWS::ApiGatewayV2::Route", {
            "RouteKey": "POST /hello"
        })

    def test_cloudfront_distribution_created(self, template):
        """Test that CloudFront distribution is created."""
        template.has_resource_properties("AWS::CloudFront::Distribution", {
            "DistributionConfig": {
                "Enabled": True,
                "DefaultCacheBehavior": {
                    "ViewerProtocolPolicy": "redirect-to-https"
                }
            }
        })

    def test_waf_webacl_created(self, template):
        """Test that WAF WebACL is created with CloudFront scope."""
        template.has_resource_properties("AWS::WAFv2::WebACL", {
            "Scope": "CLOUDFRONT",
            "DefaultAction": {
                "Allow": {}
            }
        })

    def test_waf_managed_rules_configured(self, template):
        """Test that WAF managed rule groups are configured."""
        template.has_resource_properties("AWS::WAFv2::WebACL", {
            "Rules": [
                {
                    "Name": "AWS-AWSManagedRulesAmazonIpReputationList",
                    "Priority": 1,
                    "Statement": {
                        "ManagedRuleGroupStatement": {
                            "VendorName": "AWS",
                            "Name": "AWSManagedRulesAmazonIpReputationList"
                        }
                    }
                },
                {
                    "Name": "AWS-AWSManagedRulesCommonRuleSet",
                    "Priority": 2,
                    "Statement": {
                        "ManagedRuleGroupStatement": {
                            "VendorName": "AWS",
                            "Name": "AWSManagedRulesCommonRuleSet"
                        }
                    }
                }
            ]
        })

    def test_lambda_integration_created(self, template):
        """Test that Lambda integration is created."""
        template.has_resource_properties("AWS::ApiGatewayV2::Integration", {
            "IntegrationType": "AWS_PROXY",
            "PayloadFormatVersion": "2.0"
        })

    def test_lambda_has_environment_variable(self, template):
        """Test that Lambda has CloudFront secret environment variable."""
        template.has_resource_properties("AWS::Lambda::Function", {
            "Environment": {
                "Variables": {
                    "CLOUDFRONT_SECRET": assertions.Match.any_value()
                }
            }
        })

    def test_stack_outputs_created(self, template):
        """Test that all required stack outputs are created."""
        template.has_output("HttpApiUrl", {})
        template.has_output("CloudFrontUrl", {})
        template.has_output("CloudFrontDistributionId", {})
        template.has_output("SecretHeaderName", {})
        template.has_output("SecretHeaderValue", {})

    def test_cloudfront_origin_has_custom_headers(self, template):
        """Test that CloudFront origin is configured with custom headers."""
        template.has_resource_properties("AWS::CloudFront::Distribution", {
            "DistributionConfig": {
                "Origins": [
                    {
                        "OriginCustomHeaders": [
                            {
                                "HeaderName": "X-Origin-Verify",
                                "HeaderValue": assertions.Match.any_value()
                            }
                        ]
                    }
                ]
            }
        })

    def test_stack_properties(self, stack):
        """Test stack-level properties."""
        assert stack.http_api is not None
        assert stack.protected_api is not None
        assert stack.hello_lambda is not None
        assert hasattr(stack.protected_api, 'secret_header_value')
        assert hasattr(stack.protected_api, 'distribution')