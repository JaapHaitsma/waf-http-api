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
