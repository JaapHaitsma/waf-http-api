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
  jest: false,

  projenrcTs: true,
  repositoryUrl: "https://github.com/JaapHaitsma/waf-http-api.git",

  gitignore: [".vscode"],

  releaseToNpm: true,
  prettier: true,

  publishToPypi: {
    distName: "merapar.waf-http-api", // PyPI package name
    module: "merapar_waf_http_api", // Python import path
  },
  devDeps: [
    'husky',
    'lint-staged',
  ],

});

// 2. Add the "prepare" script to install Husky hooks after `npm install`
project.package.setScript('prepare', 'husky');

// 3. Add the lint-staged configuration to your package.json
project.addFields({
  'lint-staged': {
    '*.{ts,js}': [
      'eslint --fix', // Lints and fixes TypeScript/JavaScript files
    ],
    '*.{ts,js,json,md,yml,yaml}': [
      'prettier --write', // Formats all supported file types
    ],
  },
});
project.synth();
