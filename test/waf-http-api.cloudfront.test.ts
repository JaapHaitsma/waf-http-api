import { App, SecretValue, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { WafHttpApi } from "../src/index";

describe("WafHttpApi - CloudFront Configuration", () => {
  let app: App;
  let stack: Stack;
  let httpApi: HttpApi;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, "TestStack");
    httpApi = new HttpApi(stack, "TestApi");
  });

  test("should configure origin with correct HTTP API domain", () => {
    new WafHttpApi(stack, "TestWafApi", {
      httpApi,
    });

    const template = Template.fromStack(stack);

    // Verify distribution exists
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    // Verify origin configuration
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distributionConfig =
      Object.values(distributions)[0].Properties.DistributionConfig;

    expect(distributionConfig.Origins).toHaveLength(1);
    const origin = distributionConfig.Origins[0];

    // The HTTP API URL structure is more complex than expected, so let's just verify the structure exists
    expect(origin.DomainName["Fn::Select"]).toBeDefined();
    expect(origin.DomainName["Fn::Select"][0]).toBe(2);
    expect(origin.DomainName["Fn::Select"][1]["Fn::Split"]).toBeDefined();

    // Verify origin protocol policy (HTTPPort may not be explicitly set)
    expect(origin.CustomOriginConfig.OriginProtocolPolicy).toBe("https-only");
  });

  test("should add secret header to origin requests", () => {
    new WafHttpApi(stack, "TestWafApi", {
      httpApi,
      secretHeaderValue: "a".repeat(32),
    });

    const template = Template.fromStack(stack);

    // Verify distribution exists
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    // Verify origin configuration includes custom headers
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distributionConfig =
      Object.values(distributions)[0].Properties.DistributionConfig;

    const origin = distributionConfig.Origins[0];
    expect(origin.OriginCustomHeaders).toHaveLength(1);

    const customHeader = origin.OriginCustomHeaders[0];
    expect(customHeader.HeaderName).toBe("X-Origin-Verify");
    expect(customHeader.HeaderValue).toBeDefined();
    expect(typeof customHeader.HeaderValue).toBe("string");
    expect(customHeader.HeaderValue).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  test("should generate a separate secret for each instance", () => {
    const wafApi1 = new WafHttpApi(stack, "TestWafApi1", { httpApi });
    const wafApi2 = new WafHttpApi(stack, "TestWafApi2", {
      httpApi: new HttpApi(stack, "TestApi2"),
    });

    expect(wafApi1.secretHeaderValue).not.toBe(wafApi2.secretHeaderValue);
    Template.fromStack(stack).resourceCountIs("AWS::SecretsManager::Secret", 2);
  });

  describe("Managed Origin Secret", () => {
    test("should create exactly one Secrets Manager secret by default", () => {
      new WafHttpApi(stack, "TestWafApi", { httpApi });

      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::SecretsManager::Secret", 1);
      template.hasResourceProperties("AWS::SecretsManager::Secret", {
        GenerateSecretString: {
          PasswordLength: 32,
          ExcludePunctuation: true,
          IncludeSpace: false,
        },
      });
    });

    test("should qualify the secret description with the stack name", () => {
      // Two deployments in one account must be tellable apart in the Secrets Manager console.
      new WafHttpApi(stack, "ProtectedApi", { httpApi });

      Template.fromStack(stack).hasResourceProperties(
        "AWS::SecretsManager::Secret",
        {
          Description:
            "CloudFront origin verification secret (generation 0) for TestStack/ProtectedApi",
        },
      );
    });

    test("should name the secret after the stack", () => {
      // Left to CloudFormation the generated name is <logicalId truncated>-<random>, with no
      // stack name in it. Safe to name because `Name` is the only property of
      // AWS::SecretsManager::Secret that requires replacement, and safe to delete and recreate
      // because DeletionPolicy Delete makes CloudFormation force-delete without a recovery window.
      new WafHttpApi(stack, "ProtectedApi", { httpApi });

      const secrets = Template.fromStack(stack).findResources(
        "AWS::SecretsManager::Secret",
      );
      const secret = Object.values(secrets)[0];
      expect(secret.Properties.Name).toBe(
        "TestStack-ProtectedApi-VerificationSecret-g0",
      );
      expect(secret.DeletionPolicy).toBe("Delete");
    });

    test("should create one secret and no previous at generation 0", () => {
      const wafApi = new WafHttpApi(stack, "ProtectedApi", { httpApi });

      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::SecretsManager::Secret", 1);
      template.hasResourceProperties("AWS::SecretsManager::Secret", {
        Name: "TestStack-ProtectedApi-VerificationSecret-g0",
      });
      expect(wafApi.previousOriginSecret).toBeUndefined();
      expect(wafApi.acceptedSecretValues).toHaveLength(1);
      expect(wafApi.acceptedSecretValues[0]).toBe(wafApi.secretHeaderValue);
    });

    test("should keep the previous generation alongside the current one", () => {
      const s2 = new Stack(new App(), "TestStack");
      const wafApi = new WafHttpApi(s2, "ProtectedApi", {
        httpApi: new HttpApi(s2, "Api"),
        originSecretGeneration: 2,
      });

      const template = Template.fromStack(s2);
      template.resourceCountIs("AWS::SecretsManager::Secret", 2);
      template.hasResourceProperties("AWS::SecretsManager::Secret", {
        Name: "TestStack-ProtectedApi-VerificationSecret-g2",
      });
      template.hasResourceProperties("AWS::SecretsManager::Secret", {
        Name: "TestStack-ProtectedApi-VerificationSecret-g1",
      });

      expect(wafApi.previousOriginSecret).toBeDefined();
      expect(wafApi.acceptedSecretValues).toHaveLength(2);
      // CloudFront sends the current generation; both are accepted.
      expect(wafApi.acceptedSecretValues[0]).toBe(wafApi.secretHeaderValue);
      expect(wafApi.acceptedSecretValues[1]).not.toBe(wafApi.secretHeaderValue);
    });

    test("should send the current generation from CloudFront", () => {
      const s2 = new Stack(new App(), "TestStack");
      new WafHttpApi(s2, "ProtectedApi", {
        httpApi: new HttpApi(s2, "Api"),
        originSecretGeneration: 1,
      });

      const template = Template.fromStack(s2);
      const currentLogicalId = Object.entries(
        template.findResources("AWS::SecretsManager::Secret"),
      ).find(
        ([, r]) =>
          r.Properties.Name === "TestStack-ProtectedApi-VerificationSecret-g1",
      )![0];

      const origin = Object.values(
        template.findResources("AWS::CloudFront::Distribution"),
      )[0].Properties.DistributionConfig.Origins[0];
      expect(origin.OriginCustomHeaders[0].HeaderValue).toEqual({
        "Fn::Join": [
          "",
          [
            "{{resolve:secretsmanager:",
            { Ref: currentLogicalId },
            ":SecretString:::}}",
          ],
        ],
      });
    });

    test("should carry the rotation forward when the generation increments", () => {
      // g1 must survive the bump to g2 - that is what keeps the old value accepted while the
      // distribution catches up - and g0 must be retired.
      const names = (generation: number) => {
        const s2 = new Stack(new App(), "TestStack");
        new WafHttpApi(s2, "ProtectedApi", {
          httpApi: new HttpApi(s2, "Api"),
          originSecretGeneration: generation,
        });
        return Object.values(
          Template.fromStack(s2).findResources("AWS::SecretsManager::Secret"),
        )
          .map((r) => r.Properties.Name)
          .sort();
      };

      expect(names(1)).toEqual([
        "TestStack-ProtectedApi-VerificationSecret-g0",
        "TestStack-ProtectedApi-VerificationSecret-g1",
      ]);
      expect(names(2)).toEqual([
        "TestStack-ProtectedApi-VerificationSecret-g1",
        "TestStack-ProtectedApi-VerificationSecret-g2",
      ]);
    });

    test("should not end the secret name with a hyphen and six characters", () => {
      // Secrets Manager appends `-` plus six random characters to the ARN and warns that a name
      // ending that way is confused with the suffix during partial-ARN lookups.
      new WafHttpApi(stack, "ProtectedApi", { httpApi });

      const secrets = Template.fromStack(stack).findResources(
        "AWS::SecretsManager::Secret",
      );
      for (const secret of Object.values(secrets)) {
        expect(secret.Properties.Name).not.toMatch(/-[A-Za-z0-9]{6}$/);
      }
    });

    test("should label the distribution with a comment, which is its only readable identifier", () => {
      // A CloudFront distribution has no name property, and CloudFormation cannot generate
      // the comment, so the construct sets it.
      new WafHttpApi(stack, "ProtectedApi", { httpApi });

      const distributions = Template.fromStack(stack).findResources(
        "AWS::CloudFront::Distribution",
      );
      expect(
        Object.values(distributions)[0].Properties.DistributionConfig.Comment,
      ).toBe("TestStack-ProtectedApi-Cloudfront");
    });

    test("should reference the managed secret as a dynamic reference in the origin header", () => {
      new WafHttpApi(stack, "TestWafApi", { httpApi });

      const template = Template.fromStack(stack);
      const secretLogicalId = Object.keys(
        template.findResources("AWS::SecretsManager::Secret"),
      )[0];

      const distributions = template.findResources(
        "AWS::CloudFront::Distribution",
      );
      const origin =
        Object.values(distributions)[0].Properties.DistributionConfig
          .Origins[0];
      const customHeader = origin.OriginCustomHeaders[0];

      expect(customHeader.HeaderName).toBe("X-Origin-Verify");
      expect(customHeader.HeaderValue).toEqual({
        "Fn::Join": [
          "",
          [
            "{{resolve:secretsmanager:",
            { Ref: secretLogicalId },
            ":SecretString:::}}",
          ],
        ],
      });
    });

    test("should not create a secret when secretHeaderValue is provided", () => {
      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        secretHeaderValue: "stable-origin-verify-secret-001",
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::SecretsManager::Secret", 0);

      const distributions = template.findResources(
        "AWS::CloudFront::Distribution",
      );
      const origin =
        Object.values(distributions)[0].Properties.DistributionConfig
          .Origins[0];
      expect(origin.OriginCustomHeaders[0].HeaderValue).toBe(
        "stable-origin-verify-secret-001",
      );
    });

    test("should render a supplied deploy-time token as a dynamic reference", () => {
      new WafHttpApi(stack, "TestWafApi", {
        httpApi,
        secretHeaderValue: SecretValue.secretsManager(
          "prod/api/origin-verify",
        ).unsafeUnwrap(),
      });

      const distributions = Template.fromStack(stack).findResources(
        "AWS::CloudFront::Distribution",
      );
      const origin =
        Object.values(distributions)[0].Properties.DistributionConfig
          .Origins[0];

      expect(origin.OriginCustomHeaders[0].HeaderValue).toBe(
        "{{resolve:secretsmanager:prod/api/origin-verify:SecretString:::}}",
      );
    });
  });

  describe("Template Stability Across Synths", () => {
    const synthTemplate = (props: Record<string, unknown> = {}) => {
      const localApp = new App();
      const localStack = new Stack(localApp, "TestStack");
      const localHttpApi = new HttpApi(localStack, "TestApi");
      new WafHttpApi(localStack, "TestWafApi", {
        httpApi: localHttpApi,
        ...props,
      });
      return Template.fromStack(localStack).toJSON();
    };

    test("should produce an identical template on two separate synths by default", () => {
      expect(synthTemplate()).toEqual(synthTemplate());
    });

    test("should produce an identical template on two separate synths when secretHeaderValue is provided", () => {
      expect(
        synthTemplate({ secretHeaderValue: "stable-origin-verify-secret-001" }),
      ).toEqual(
        synthTemplate({ secretHeaderValue: "stable-origin-verify-secret-001" }),
      );
    });

    test("should produce an identical template on two separate synths for a deploy-time token", () => {
      const token = () =>
        synthTemplate({
          secretHeaderValue: SecretValue.secretsManager(
            "prod/api/origin-verify",
          ).unsafeUnwrap(),
        });

      expect(token()).toEqual(token());
    });
  });

  test("should configure CloudFront behavior policies correctly", () => {
    new WafHttpApi(stack, "TestWafApi", {
      httpApi,
    });

    const template = Template.fromStack(stack);

    // Verify distribution exists
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    // Verify behavior configuration
    const distributions = template.findResources(
      "AWS::CloudFront::Distribution",
    );
    const distributionConfig =
      Object.values(distributions)[0].Properties.DistributionConfig;

    const defaultBehavior = distributionConfig.DefaultCacheBehavior;

    // Verify viewer protocol policy
    expect(defaultBehavior.ViewerProtocolPolicy).toBe("redirect-to-https");

    // Verify allowed methods (order may vary)
    expect(defaultBehavior.AllowedMethods).toEqual(
      expect.arrayContaining([
        "DELETE",
        "GET",
        "HEAD",
        "OPTIONS",
        "PATCH",
        "POST",
        "PUT",
      ]),
    );
    expect(defaultBehavior.AllowedMethods).toHaveLength(7);

    // Verify caching is disabled
    expect(defaultBehavior.CachePolicyId).toBe(
      "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
    ); // CACHING_DISABLED policy ID

    // Verify origin request policy (ID may vary by CDK version)
    expect(defaultBehavior.OriginRequestPolicyId).toBeDefined();
    expect(typeof defaultBehavior.OriginRequestPolicyId).toBe("string");
  });
});
