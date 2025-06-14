# API Reference <a name="API Reference" id="api-reference"></a>

## Constructs <a name="Constructs" id="Constructs"></a>

### WafHttpApi <a name="WafHttpApi" id="waf-http-api.WafHttpApi"></a>

A CDK construct that fronts an HTTP API with a CloudFront distribution and protects it with AWS WAF.

#### Initializers <a name="Initializers" id="waf-http-api.WafHttpApi.Initializer"></a>

```typescript
import { WafHttpApi } from 'waf-http-api'

new WafHttpApi(scope: Construct, id: string, props: WafHttpApiProps)
```

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.scope">scope</a></code> | <code>constructs.Construct</code> | *No description.* |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.id">id</a></code> | <code>string</code> | *No description.* |
| <code><a href="#waf-http-api.WafHttpApi.Initializer.parameter.props">props</a></code> | <code><a href="#waf-http-api.WafHttpApiProps">WafHttpApiProps</a></code> | *No description.* |

---

##### `scope`<sup>Required</sup> <a name="scope" id="waf-http-api.WafHttpApi.Initializer.parameter.scope"></a>

- *Type:* constructs.Construct

---

##### `id`<sup>Required</sup> <a name="id" id="waf-http-api.WafHttpApi.Initializer.parameter.id"></a>

- *Type:* string

---

##### `props`<sup>Required</sup> <a name="props" id="waf-http-api.WafHttpApi.Initializer.parameter.props"></a>

- *Type:* <a href="#waf-http-api.WafHttpApiProps">WafHttpApiProps</a>

---

#### Methods <a name="Methods" id="Methods"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.toString">toString</a></code> | Returns a string representation of this construct. |

---

##### `toString` <a name="toString" id="waf-http-api.WafHttpApi.toString"></a>

```typescript
public toString(): string
```

Returns a string representation of this construct.

#### Static Functions <a name="Static Functions" id="Static Functions"></a>

| **Name** | **Description** |
| --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.isConstruct">isConstruct</a></code> | Checks if `x` is a construct. |

---

##### ~~`isConstruct`~~ <a name="isConstruct" id="waf-http-api.WafHttpApi.isConstruct"></a>

```typescript
import { WafHttpApi } from 'waf-http-api'

WafHttpApi.isConstruct(x: any)
```

Checks if `x` is a construct.

###### `x`<sup>Required</sup> <a name="x" id="waf-http-api.WafHttpApi.isConstruct.parameter.x"></a>

- *Type:* any

Any object.

---

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.property.node">node</a></code> | <code>constructs.Node</code> | The tree node. |
| <code><a href="#waf-http-api.WafHttpApi.property.distribution">distribution</a></code> | <code>aws-cdk-lib.aws_cloudfront.Distribution</code> | The CloudFront distribution created by the construct. |
| <code><a href="#waf-http-api.WafHttpApi.property.secretHeaderValue">secretHeaderValue</a></code> | <code>string</code> | The generated secret value for the custom header. |

---

##### `node`<sup>Required</sup> <a name="node" id="waf-http-api.WafHttpApi.property.node"></a>

```typescript
public readonly node: Node;
```

- *Type:* constructs.Node

The tree node.

---

##### `distribution`<sup>Required</sup> <a name="distribution" id="waf-http-api.WafHttpApi.property.distribution"></a>

```typescript
public readonly distribution: Distribution;
```

- *Type:* aws-cdk-lib.aws_cloudfront.Distribution

The CloudFront distribution created by the construct.

---

##### `secretHeaderValue`<sup>Required</sup> <a name="secretHeaderValue" id="waf-http-api.WafHttpApi.property.secretHeaderValue"></a>

```typescript
public readonly secretHeaderValue: string;
```

- *Type:* string

The generated secret value for the custom header.

Use this value in your HTTP API's authorizer.

---

#### Constants <a name="Constants" id="Constants"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#waf-http-api.WafHttpApi.property.SECRET_HEADER_NAME">SECRET_HEADER_NAME</a></code> | <code>string</code> | The name of the custom header CloudFront will add. |

---

##### `SECRET_HEADER_NAME`<sup>Required</sup> <a name="SECRET_HEADER_NAME" id="waf-http-api.WafHttpApi.property.SECRET_HEADER_NAME"></a>

```typescript
public readonly SECRET_HEADER_NAME: string;
```

- *Type:* string

The name of the custom header CloudFront will add.

Use this in your Lambda Authorizer.

---

## Structs <a name="Structs" id="Structs"></a>

### WafHttpApiProps <a name="WafHttpApiProps" id="waf-http-api.WafHttpApiProps"></a>

Properties for the WafForHttpApi construct.

#### Initializer <a name="Initializer" id="waf-http-api.WafHttpApiProps.Initializer"></a>

```typescript
import { WafHttpApiProps } from 'waf-http-api'

const wafHttpApiProps: WafHttpApiProps = { ... }
```

#### Properties <a name="Properties" id="Properties"></a>

| **Name** | **Type** | **Description** |
| --- | --- | --- |
| <code><a href="#waf-http-api.WafHttpApiProps.property.httpApi">httpApi</a></code> | <code>aws-cdk-lib.aws_apigatewayv2.HttpApi</code> | The HTTP API to be protected by the WAF and CloudFront. |
| <code><a href="#waf-http-api.WafHttpApiProps.property.wafRules">wafRules</a></code> | <code>aws-cdk-lib.aws_wafv2.CfnWebACL.RuleProperty[]</code> | Optional: Custom WAF rules to apply. |

---

##### `httpApi`<sup>Required</sup> <a name="httpApi" id="waf-http-api.WafHttpApiProps.property.httpApi"></a>

```typescript
public readonly httpApi: HttpApi;
```

- *Type:* aws-cdk-lib.aws_apigatewayv2.HttpApi

The HTTP API to be protected by the WAF and CloudFront.

---

##### `wafRules`<sup>Optional</sup> <a name="wafRules" id="waf-http-api.WafHttpApiProps.property.wafRules"></a>

```typescript
public readonly wafRules: RuleProperty[];
```

- *Type:* aws-cdk-lib.aws_wafv2.CfnWebACL.RuleProperty[]

Optional: Custom WAF rules to apply.

If not provided, a default set of AWS Managed Rules will be used.

---



