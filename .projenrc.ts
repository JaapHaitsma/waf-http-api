import { awscdk } from "projen";
const project = new awscdk.AwsCdkConstructLibrary({
  name: "waf-http-api",
  packageName: "waf-http-api",
  majorVersion: 1,
  description:
    "A CDK construct that fronts an HTTP API with a CloudFront distribution and protects it with AWS WAF.",
  keywords: [
    "awscdk",
    "aws",
    "cdk",
    "api-gateway",
    "http-api",
    "waf",
    "cloudfront",
  ],
  author: "Jaap Haitsma",
  authorAddress: "jaap@haitsma.org",
  copyrightOwner: "Merapar Technologies Group B.V.",
  license: "MIT",
  cdkVersion: "2.200.0",
  defaultReleaseBranch: "main",
  jsiiVersion: "~5.8.0",
  jest: true,
  projenrcTs: true,
  repositoryUrl: "https://github.com/JaapHaitsma/waf-http-api.git",
  depsUpgradeOptions: {
    workflowOptions: {
      schedule: { cron: [] }, // Keep a schedule, or set to empty array to disable
    },
  },

  gitignore: [".vscode"],

  releaseToNpm: true,
  prettier: true,

  publishToPypi: {
    distName: "waf-http-api", // PyPI package name
    module: "waf_http_api", // Python import path
  },
});

project.synth();
