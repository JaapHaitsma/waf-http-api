# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`waf-http-api` is a single-construct AWS CDK library, published to **npm and PyPI** from one TypeScript source via [jsii](https://github.com/aws/jsii). The construct fronts an `HttpApi` (API Gateway v2) with a CloudFront distribution, attaches a WAF WebACL, optionally manages a custom domain + ACM certificate + Route 53 records, and injects a secret origin-verification header.

The project is managed by [projen](https://github.com/projen/projen): most config files are generated, not hand-written.

## Commands

```bash
yarn install                 # first-time setup
npx projen                   # regenerate project files after editing .projenrc.ts
npx projen build             # full build: synth → compile (jsii) → docgen → test → package
npx projen compile           # jsii compile only (src → lib/, .jsii manifest)
npx projen test              # jest (with --updateSnapshot) + eslint
npx projen test:watch        # jest watch mode
npx projen eslint            # lint + autofix
npx projen docgen            # regenerate API.md from the .jsii manifest
```

Running a single test or a single test name (bypassing the projen wrapper):

```bash
npx jest test/waf-http-api.domain.test.ts
npx jest -t "should create A record"
```

Running eslint directly requires the legacy-config env var (eslint 9 is used in eslintrc mode):

```bash
ESLINT_USE_FLAT_CONFIG=false npx eslint --ext .ts src test
```

## Editing rules that are easy to get wrong

**Generated files must not be edited by hand.** Everything marked `linguist-generated` in [.gitattributes](.gitattributes) is projen output — `package.json`, `.eslintrc.json`, `.github/workflows/*`, `.projen/*`, `tsconfig.json`, `test/tsconfig.json`, `projenrc/tsconfig.json`, `.husky/pre-commit`, `LICENSE`, `.gitignore`. Change [.projenrc.ts](.projenrc.ts) and run `npx projen` instead. Same for `lib/`, `dist/`, and `coverage/`.

**`API.md` is generated too** (by `jsii-docgen` from the doc comments in `src/`). To change the published API docs, edit the TSDoc in [src/index.ts](src/index.ts) and run `npx projen docgen`. `README.md` is hand-written and is the one doc file to update manually when behaviour changes.

**`package.json` version is `0.0.0` on purpose.** Versions come from git tags via the projen release workflow — never bump it manually.

**PR titles must be semantic**, restricted to `feat`, `fix`, or `chore` (enforced by `.github/workflows/pull-request-lint.yml`).

A husky pre-commit hook runs `lint-staged` (prettier + eslint --fix) over staged `.js/.ts/.json/.md` files.

## jsii constraints on `src/`

Because `src/` is compiled by jsii and cross-compiled to Python, the public API is not plain TypeScript:

- Public interface properties must be `readonly`; props interfaces are exported and flat.
- No union types, generics, tuples, or structural/anonymous types in exported signatures.
- Only one exported entry point: `src/index.ts` is the jsii `rootDir` and `main`.
- Doc comments are the API documentation — they end up in `API.md` and in the Python bindings, so keep the `@example` blocks accurate.

`npx projen compile` (jsii) will fail on violations that plain `tsc` would accept.

## Architecture

Everything lives in [src/index.ts](src/index.ts) — one `WafHttpApi` construct. Constructor order matters and encodes the validation contract:

1. **Domain + hosted zone validation.** If `domain` is set, `hostedZone` is **required** (hard error). Domain format is regex-validated, including wildcard rules (`*.example.com`, single leading wildcard only).
2. **Certificate resolution.** A provided `certificate` is validated to be in `us-east-1` (parsed out of the ARN — CloudFront requirement) and checked for domain compatibility; full domain-coverage checking is impossible at synth time, so it only warns. With `domain` but no certificate, an `acm.Certificate` is auto-created with DNS validation against the hosted zone.
3. **Mismatched props warn rather than throw**: `certificate` without `domain`, and `hostedZone` without `domain`, are both ignored with a `console.warn`. Tests assert on these warnings.
4. **WAF WebACL** — `scope: "CLOUDFRONT"` (mandatory for CloudFront association), `defaultAction: allow`, rules from `props.wafRules` or `createDefaultRules()` (AWS managed IP-reputation + common rule set). Both `name` and `visibilityConfig.metricName` come from `buildLabel(id, "WebACL")`. There is deliberately **no** prop to override the name — see the naming note below.
5. **CloudFront distribution** — origin domain is extracted from the HTTP API URL with `Fn.select(2, Fn.split("/", props.httpApi.url!))` (token-safe, works at synth time without resolving the URL). Caching is disabled, all methods allowed, and the origin request policy is `ALL_VIEWER_EXCEPT_HOST_HEADER` so API Gateway routing still works.
6. **Route 53 A + AAAA alias records** — created only when both `hostedZone` and `domain` are present.

**Origin verification:** `WafHttpApi.SECRET_HEADER_NAME` (`X-Origin-Verify`) is a static constant. `secretHeaderValue` has two sources, resolved in the constructor between the hosted-zone block and the WebACL:

1. **Default** — the construct creates an `AWS::SecretsManager::Secret` with `generateSecretString` (exposed as `originSecret`) and the header carries its dynamic reference, so CloudFormation mints the value once at create time and the template is synth-stable. `secretHeaderValue` is then an **unresolved token**: fine in any resource property, broken in `CfnOutput` or any synth-time string operation.
2. **`secretHeaderValue` prop** — used verbatim after `validateSecretHeaderValue` (empty/control-chars/>1783 chars throw; <16 chars warns; `Token.isUnresolved` values skip all checks). No secret resource is created, so this is also the zero-cost path.

In v1 the value was `crypto.randomBytes(16)` at **synth time**, so it changed on every synth — that is the NMT-82 bug, and there is deliberately no way to opt back into it.

**Rotating the managed secret** goes through `originSecretGeneration`. At generation `n` the construct creates **two** secrets, `n` and `n-1` (child ids `OriginVerifySecret{n}`, names `...-VerificationSecret-g{n}`), exposes both via `acceptedSecretValues`, and sends `n` from CloudFront. Incrementing adds a resource and removes the oldest — no replacement — so the value CloudFront is still sending during the ~60s distribution update stays accepted, which is what makes rotation window-free. Roll one generation at a time; skipping two retires the value CloudFront is still sending. Writing a new value into Secrets Manager directly does nothing: the construct emits a **versionless** dynamic reference (`{{resolve:secretsmanager:<arn>:SecretString:::}}`, pinned by a test) and CloudFormation re-resolves a dynamic reference only for resources it actually updates. Worse than a no-op — a later unrelated deploy that updates one consumer pulls the new value into just that consumer, leaving a persistent split brain. Never enable automatic rotation on this secret. The generation is capped at 9999 so the `-g<n>` suffix stays under the six characters Secrets Manager appends to the ARN.

Backends compare the incoming header against this value (surfaced to Lambda via an env var in the examples).

**CloudFormation's generated names do not always carry the stack name.** Verified on a real deploy: an unnamed `AWS::WAFv2::WebACL` in stack `AppStack` came back as `ProtectedApiWebAclAB38EB29-Iqnds2cWntwI` — logical id plus random, no stack name. So the WebACL **is** named explicitly, from `buildLabel(id, "WebACL")`. That is safe because `name` and `scope` are the only replacement triggers on that resource and `scope` is hard-coded, so a replacement can only follow a name change, where old and new differ. Caveat: CLOUDFRONT-scoped WebACLs share the `us-east-1` namespace across regions, so the **same stack name deployed to two regions collides** and the second deploy fails with "already exists". There is deliberately no override prop — a caller-chosen name forfeits CloudFormation's ability to replace the resource. Multi-region deployments must vary the stack name (`AppStack-euw1`), which is normal practice. The Secrets Manager secret is named the same way (`buildLabel(id, "VerificationSecret")`) - regional, so no cross-region constraint, and safe to delete/recreate because `removalPolicy` is `DESTROY`, which CloudFormation applies with `ForceDeleteWithoutRecovery`.

**Rotating the secret opens a real rejection window**, measured on a live deploy: the Lambda env var reached `UPDATE_COMPLETE` in 8s, the distribution in 67s - 59 seconds during which CloudFront forwarded a secret the origin would reject. A cached API Gateway Lambda authorizer (`AuthorizerResultTtlInSeconds`, 5 min default, keyed on the header value) **masks** this entirely: that run saw 0 failures, yet the old secret returned 403 as soon as its cache entry expired. Never conclude from a clean test that the dual-accept rotation step is unnecessary.

**Tagging:** the constructor calls `Tags.of(this).add("waf-http-api:construct", this.node.path)`, which CDK propagates to every taggable resource in scope. This is the attribution mechanism that always works — tags update in place, never collide, and reach resources that cannot be named (the auto-generated ACM certificate). Route 53 record sets do not support tags; they are identified by the domain.

**`buildLabel(id, kind)`** produces `<stackName>-<constructId>-<kind>`, used for the WebACL's name **and** its `visibilityConfig.metricName` (one string for both, which also settles which of the two drives the CloudWatch `WebACL` dimension) and for the distribution's `comment` (a distribution has no name property at all). Sanitized to `^[0-9A-Za-z_-]{1,128}$`; only past 128 chars does it get a deterministic sha256 suffix as a truncation tie-breaker.

`buildLabel` returns `undefined` when `Stack.of(this).stackName` is a token (`NestedStack`) — a token cannot be sanitized or truncated without corrupting it — and callers fall back: WebACL name omitted so CFN generates one, metric name `${id}-Waf`, and the API-id comment text.

Used for three resources: the WebACL (`WebACL`), the Secrets Manager secret (`VerificationSecret`), and the CloudFront distribution's **comment** (`Cloudfront`) — a distribution has no name property, so its `Comment`, shown as "Description" in the console, is the only human-readable identifier. Naming the secret is safe **because `removalPolicy` is `DESTROY`**: per the CloudFormation `DeletionPolicy` docs, CFN deletes secrets with `ForceDeleteWithoutRecovery`, so no recovery window survives to collide when a stack is deleted and recreated. If that removal policy ever becomes configurable, revisit the secret name.

Error messages are deliberately long, emoji-prefixed, and prescriptive (issue → solution → examples). Match that style when adding validation — several tests assert on message content.

## Tests

`test/` is split by concern, not by file-under-test: `basic`, `waf`, `cloudfront`, `domain`, `certificate`, `hosted-zone`, `validation`, `template`. Each builds an `App`/`Stack`/`HttpApi` in `beforeEach` and asserts with `Template.fromStack(...)` from `aws-cdk-lib/assertions`. When adding behaviour, add cases to the matching concern file rather than creating a new one. Coverage is collected on every run (`coverage/`), and jest-junit writes to `test-reports/`.

## `example/`

[example/typescript/](example/typescript/) and [example/python/](example/python/) are standalone CDK apps that consume the **published** package from npm/PyPI — they are not wired to the local build. They are excluded from the root `tsconfig`, `tsconfig.dev`, and eslint, and have their own `package.json` / `requirements.txt` and their own `tsconfig.json` (which is why it is not projen-managed). The Python example is driven by its `Makefile` (`make install`, `make test`, `make deploy`).
