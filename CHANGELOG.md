## 2.0.0-alpha.17 (2019-12-05)

### Breaking Changes

- Update for new SSO flow

## 2.0.0-alpha.16 (2019-11-08)

### Bug Fixes

- Export validation errors types and functions

### Features

- Remove realm with API
- Use FormData for uploading asset

## 2.0.0-alpha.15 (2019-11-06)

### Bug Fixes

- Export encodeQuery and encodeQueryComponent

## 2.0.0-alpha.14 (2019-11-06)

### Bug Fixes

- Add back missing title in CHANGELOG

### Features

- Document how to consume script tag from unpkg.com
- Update api-documenter
- Update typescript
- Update eslint
- Update build time dependencies
- Add validation error typings
- Implement asset gear SDK API
- Add requestPhoneVerification
- Allow ignoring error in logout

### Breaking Changes

- Update error shape
- Use otpauthURI and qrCodeImageURI from server response

## 2.0.0-alpha.13 (2019-10-10)

### Features

- Add script bundle to published package

## 2.0.0-alpha.12 (2019-10-02)

### Breaking Changes

- Rename `defaultContainer` to `default`.
- Merge container and namespace in script tag bundle.

### Features

- Add MFA API
- Update Sesson API
- Return User in SSO link operation
- Versioned documentation

### Bug Fixes

- Handle unexpected errors correctly

## 2.0.0-alpha.11 (2019-09-10)

### Features

- Update for new session mechanism

## 2.0.0-alpha.11 (2019-09-10)

### Features

- Update for new session mechanism

## 2.0.0-alpha.10 (2019-08-29)

### Bug Fixes

- Remove trailing slash in configure()

## 2.0.0-alpha.9 (2019-08-27)

### Features

- Introduce options and default values for containers constructor
- Refactor ContainerStorage

## 2.0.0-alpha.8 (2019-08-22)

### Features

- Support `defaultContainer.fetch` for calling microservices

## 2.0.0-alpha.7 (2019-08-20)

### Bug Fixes

- Fix auth action request body is not serialized

## 2.0.0-alpha.6 (2019-08-20)

### Breaking Changes

- Replace SkygearErrorCode with SkygearErrorName

### Features

- Improve error decoding

## 2.0.0-alpha.5 (2019-08-19)

### Breaking Changes

- Support json and query for common HTTP methods

## 2.0.0-alpha.4 (2019-08-14)

### Features

- Add encodeQueryComponent and encodeQuery
- Add BaseAPIClient.get

## 2.0.0-alpha.3 (2019-08-09)

### Features

- Make apiClient a type parameter so that WebContainer can be extended with extended WebAPIClient.

## 2.0.0-alpha.2 (2019-08-08)

### Breaking Changes

- Rename `@skygear/node` to `@skygear/node-client`

## 2.0.0-alpha.1 (2019-08-01)

### Features

- Create GitHub release

## 2.0.0-alpha.0 (2019-08-01)

### Features

- Experimental release

