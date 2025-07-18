# Requirements Document

## Introduction

This feature enhances the WafHttpApi construct to support custom domains and SSL certificates. Currently, the construct only provides access through the CloudFront distribution's default domain name. This enhancement will allow users to specify their own custom domain and optionally provide an SSL certificate, with automatic certificate generation when a domain is specified without a certificate.

## Requirements

### Requirement 1

**User Story:** As a developer using WafHttpApi, I want to specify a custom domain for my API, so that I can provide a branded and memorable endpoint for my users.

#### Acceptance Criteria

1. WHEN a domain property is provided in WafHttpApiProps THEN the CloudFront distribution SHALL be configured with the specified custom domain
2. WHEN a domain is specified THEN the distribution SHALL accept requests on that domain
3. WHEN no domain is provided THEN the construct SHALL behave exactly as it does currently with only the CloudFront default domain

### Requirement 2

**User Story:** As a developer using WafHttpApi, I want to provide my own SSL certificate for the custom domain, so that I can use certificates from my existing certificate management process.

#### Acceptance Criteria

1. WHEN both domain and certificate properties are provided THEN the CloudFront distribution SHALL use the provided certificate for the custom domain
2. WHEN a certificate is provided without a domain THEN the system SHALL ignore the certificate property
3. WHEN a certificate is provided THEN it SHALL be validated to ensure it matches the specified domain

### Requirement 3

**User Story:** As a developer using WafHttpApi, I want automatic certificate generation when I specify a domain without providing a certificate, so that I can quickly set up HTTPS without manual certificate management.

#### Acceptance Criteria

1. WHEN a domain is specified AND no certificate is provided THEN the system SHALL automatically generate an SSL certificate for the domain
2. WHEN automatic certificate generation occurs THEN the certificate SHALL be created using AWS Certificate Manager
3. WHEN automatic certificate generation occurs THEN the certificate SHALL be validated using DNS validation
4. WHEN automatic certificate generation occurs THEN the certificate SHALL be created in the us-east-1 region (required for CloudFront)

### Requirement 4

**User Story:** As a developer using WafHttpApi, I want access to the generated certificate resource, so that I can reference it in other parts of my infrastructure or output its ARN.

#### Acceptance Criteria

1. WHEN a certificate is automatically generated THEN the construct SHALL expose the certificate as a public readonly property
2. WHEN a certificate is provided by the user THEN the construct SHALL expose the provided certificate as a public readonly property
3. WHEN no certificate is used THEN the certificate property SHALL be undefined

### Requirement 5

**User Story:** As a developer using WafHttpApi, I want to provide a hosted zone so that DNS records are automatically created for my custom domain, so that I don't have to manually configure Route 53 records.

#### Acceptance Criteria

1. WHEN a hostedZone property is provided along with a domain THEN the system SHALL automatically create Route 53 A and AAAA records pointing to the CloudFront distribution
2. WHEN a hostedZone is provided without a domain THEN the system SHALL ignore the hostedZone property with a warning
3. WHEN a domain is provided without a hostedZone THEN the system SHALL work normally but not create DNS records
4. WHEN a hostedZone is provided THEN the domain SHALL be validated to ensure it matches or is a subdomain of the hosted zone's domain

### Requirement 6

**User Story:** As a developer using WafHttpApi, I want access to the created DNS records, so that I can reference them in other parts of my infrastructure or output their details.

#### Acceptance Criteria

1. WHEN DNS records are automatically created THEN the construct SHALL expose the A record as a public readonly property
2. WHEN DNS records are automatically created THEN the construct SHALL expose the AAAA record as a public readonly property
3. WHEN no hosted zone is provided THEN the DNS record properties SHALL be undefined

### Requirement 7

**User Story:** As a developer using WafHttpApi, I want clear error handling when invalid hosted zone configurations are provided, so that I can quickly identify and fix configuration issues.

#### Acceptance Criteria

1. WHEN an invalid domain format is provided THEN the system SHALL throw a descriptive error during synthesis
2. WHEN a certificate is provided that doesn't match the domain THEN the system SHALL throw a descriptive error during synthesis
3. WHEN certificate generation fails THEN the system SHALL provide clear error messages indicating the cause
4. WHEN a hosted zone is provided that doesn't match the domain THEN the system SHALL throw a descriptive error during synthesis
