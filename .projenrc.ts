import { awscdk } from "projen";
const project = new awscdk.AwsCdkConstructLibrary({
  name: "@merapar/waf-http-api",
  packageName: "waf-http-api",
  description:
    "CDK construct that is WAF before an HTTP API. This cannot be done directly. A cloudfront distribution has to be put in between. This CDK construct does this" /* The description is just a string that helps people understand the purpose of the package. */,
  author: "Jaap Haitsma",
  authorAddress: "jaap@haitsma.org",
  copyrightOwner: "Merapar Technologies Group B.V.",
  license: "MIT",
  cdkVersion: "2.200.0",
  defaultReleaseBranch: "main",
  jsiiVersion: "~5.8.0",

  projenrcTs: true,
  repositoryUrl: "https://github.com/merapar/waf-http-api.git",

  // deps: [],                /* Runtime dependencies of this module. */
  // devDeps: [],             /* Build dependencies for this module. */
  gitignore: [".vscode"],
});
project.synth();
