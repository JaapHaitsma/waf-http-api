import { awscdk } from "projen";
const project = new awscdk.AwsCdkConstructLibrary({
  name: "waf-http-api",
  packageName: "waf-http-api",
  prerelease: "beta",
  description:
    "A CDK construct that fronts an HTTP API with a CloudFront distribution and protects it with AWS WAF.",
  keywords: ["aws", "cdk", "api-gateway", "http-api", "waf", "cloudfront"],
  author: "Jaap Haitsma",
  authorAddress: "jaap@haitsma.org",
  copyrightOwner: "Merapar Technologies Group B.V.",
  license: "MIT",
  cdkVersion: "2.200.0",
  defaultReleaseBranch: "main",
  jsiiVersion: "~5.8.0",

  projenrcTs: true,
  repositoryUrl: "https://github.com/JaapHaitsma/waf-http-api.git",

  gitignore: [".vscode"],

  releaseToNpm: true,
  prettier: true,

  // publishToPypi: {
  //   distName: 'merapar.waf-http-api',
  //   module: 'merapar_waf_http_api',
  //},
});
project.synth();
