# Implementation Plan

- [x] 1. Add ACM import and update interface definitions

  - Import AWS Certificate Manager module in the main index.ts file
  - Add domain and certificate properties to WafHttpApiProps interface
  - Add certificate and customDomain properties to WafHttpApi class
  - _Requirements: 1.1, 2.1, 4.1_

- [x] 2. Implement domain validation logic

  - Create private method to validate domain format using regex
  - Add validation for domain format in constructor
  - Throw descriptive errors for invalid domain formats
  - _Requirements: 5.1_

- [x] 3. Implement certificate validation logic

  - Create private method to validate certificate region (must be us-east-1)
  - Create private method to validate certificate-domain compatibility
  - Add certificate validation calls in constructor
  - Throw descriptive errors for certificate validation failures
  - _Requirements: 2.3, 5.2_

- [x] 4. Implement automatic certificate generation

  - Add logic to create ACM certificate when domain provided without certificate
  - Configure certificate with DNS validation
  - Ensure certificate is created in us-east-1 region
  - Set certificate property when auto-generated
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Update CloudFront distribution configuration

  - Add domain aliases to distribution when domain is provided
  - Configure viewer certificate when certificate is available
  - Ensure existing distribution configuration remains unchanged
  - _Requirements: 1.1, 1.2, 2.1_

- [x] 6. Add property assignments and expose new properties

  - Set customDomain property when domain is provided
  - Set certificate property for both provided and auto-generated certificates
  - Ensure properties are undefined when not applicable
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Add comprehensive error handling and warnings

  - Add warning when certificate provided without domain
  - Ensure all error messages are descriptive and actionable
  - Add proper error handling for certificate generation failures
  - _Requirements: 2.2, 5.3_

- [x] 8. Write unit tests for new functionality

  - Test constructor with no domain/certificate (backward compatibility)
  - Test constructor with domain only (auto-certificate generation)
  - Test constructor with domain and certificate (use provided certificate)
  - Test constructor with certificate only (should ignore certificate)
  - Test domain validation with valid and invalid formats
  - Test certificate validation for region and domain compatibility
  - Test property exposure for all scenarios
  - _Requirements: All requirements validation_

- [x] 9. Update TypeScript documentation and examples

  - Add JSDoc comments for new properties and parameters
  - Update constructor documentation with new parameters
  - Add usage examples showing domain and certificate configuration
  - Update class-level documentation to mention custom domain support
  - _Requirements: Documentation for 1.1, 2.1, 3.1_

- [x] 10. Add Route 53 import and update interface definitions

  - Import AWS Route 53 module in the main index.ts file
  - Add hostedZone property to WafHttpApiProps interface
  - Add aRecord and aaaaRecord properties to WafHttpApi class
  - _Requirements: 5.1, 6.1, 6.2_

- [x] 11. Implement hosted zone validation logic

  - Create private method to validate hosted zone domain compatibility
  - Add validation to ensure domain matches or is subdomain of hosted zone
  - Add hosted zone validation calls in constructor
  - Throw descriptive errors for hosted zone validation failures
  - _Requirements: 5.4, 7.4_

- [x] 12. Implement DNS record creation logic

  - Add logic to create Route 53 A record when hostedZone and domain are provided
  - Add logic to create Route 53 AAAA record when hostedZone and domain are provided
  - Configure records to point to CloudFront distribution
  - Set aRecord and aaaaRecord properties when created
  - _Requirements: 5.1, 6.1, 6.2_

- [x] 13. Add hosted zone error handling and warnings

  - Add warning when hosted zone provided without domain
  - Ensure all hosted zone error messages are descriptive and actionable
  - Add proper error handling for DNS record creation failures
  - _Requirements: 5.2, 7.4_

- [x] 14. Write unit tests for hosted zone functionality

  - Test constructor with domain and hosted zone (DNS records created)
  - Test constructor with hosted zone only (should ignore hosted zone)
  - Test hosted zone validation with valid and invalid configurations
  - Test DNS record creation and property exposure
  - Test domain-hosted zone compatibility validation
  - _Requirements: All hosted zone requirements validation_

- [x] 15. Update documentation for hosted zone support
  - Add JSDoc comments for hostedZone property and DNS record properties
  - Update constructor documentation with hosted zone parameter
  - Add usage examples showing hosted zone configuration
  - Update class-level documentation to mention automatic DNS record creation
  - _Requirements: Documentation for 5.1, 6.1, 6.2_
