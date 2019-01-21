## 1.7.0 (2019-01-21)

### Bug Fixes

- Fix pubsub url path. Only host of container endpoint was used in pubsub url, but the path should also be added.


## 1.6.4 (2018-11-13)

### Bug Fixes

- Fix react-native build problem #462

### Other notes

- Export getSigner for signing asset in cloud container


## 1.6.3 (2018-09-04)

### Features

- Add util functions helping publish event in cloud code

## 1.6.2 (2018-08-24)

### Features

- Allow user to access uploadAsset function from db (#429)

### Bug Fixes

- Throw asset s3 error
- Add asset too large error code
- Add verification required error code

### Other Notes

- Update npm, fix audit and update build system for node 10

## 1.6.0 (2018-06-26)

### Features

- Add Lambda support for Skygear Data Type in Cloud and Client SDK #409
- Add logger for structural logging #419, #420
- Implement Query.and

### Bug Fixes

- Fix cannot upload base64 asset in cloud

### Other Notes

- Use node:8 docker image
- Remove unnecessary console.log
- Update `hoek` dependencies of `mock-browser` for security updates.

## 1.5.0 (2018-04-23)

### Features

- Add admin reset password api
- Implement request verification and submit code

### Bug Fixes

- Fix current user not set to null when logout request fail #401

### Other Notes

- Support configModule and main entry point return promise
- Add admin prefix to disable/enable user functions
- Remove default endpoint in container

## 1.4.0 (2018-03-07)

### Features

- Support enable/disable user account #380

### Other Notes

- Fix deploy minified latest
- Update cloud example and remove nodedev image
- Use docker multi-stage build
- Update error code list
- Check in package-lock.json

## 1.3.1 (2018-02-01)

### Bug Fixes
- Fix signup profile serialization
- Fix pubsub test case
- Fix pubsub websocket state maybe inconsitent
- Fail test case when there is unhandled promise rejection (#371)
- Handle falsy skygear-user value in store (#361)
- Fix auth init before login (361)
- Fix Record construct with falsy attrs
- Inject sso and forgot password to react native container

### Other Notes
- Add node_js: 9 in travis
-  Add release-commit target

## 1.3.0 (2018-01-04)

### Features
- Implement loginWithCustomToken (#359)

## 1.2.0 (2017-12-11)

### Features
- Re-export SkygearError as skygear.Error
- Implement SSO login flow

    Supported flow are
    - loginOAuthProviderWithRedirect
    - loginOAuthProviderWithPopup
    - linkOAuthProviderWithAccessToken
    - unlinkAuthProvider

    refs SkygearIO/features#5

### Bug Fixes
- Fix config react native for chat (#303, SkygearIO/chat-SDK-JS#78)
- Fix register handler with different HTTP method (#325)
- Do not set the X-Skygear-Access-Token on null

### Other Notes

- Add Makefile targets for deploying minified JS #349
- Apply Bootstrap 3 Style to example
- Update pubsub and query example page style with bootstrap 3

## 1.1.2 (2017-11-08)

### Bug Fixes

- Fix "cannot read property 'user_id' of undefined" (#323)
- Update toJSON handling for array like object

### Other Notes

- Local dev server to serve example html (#333)
- Fix broken link in doc (SkygearIO/skygear-doc#529)

## 1.1.1 (2017-10-23)

### Features

- Add sendToUser and sendToDevice (#307)
- Get cloud code container for current request context (#300)
- Add Content-Type: application/json to request made by container (#308)
- Inject version string in Makefile, and include the version in request header


### Bug fixes

- Fix `npm run dev` doesn’t rebuild
- Allow pubsub to publish falsy message (#228)
- Update API reference (#281)
- Install missing esdoc plugins
- Change op and handler option auth_required to key_required (#273)
- Return meaningful error for undefined record key (#113)
- Handle non json request body with 400

### Other notes

- Add a proper README.md
- Add node 8 to travis-CI env matrix, remove  node 4
- Use npm@5.3.0 and package-lock.json (#283)
- Run lerna bootstrap in postinstall stage (#284)
- Add minimal cloud example

## 1.1.0 (2017-08-07)

### Incompatible Changes

- Authentication-related function will return record instead of user object

  In previous version of SKYKit, authentication methods return a user object
  which contains user-related information such as User ID, username and
  email. These information is moved to user record and the authentication
  methods are updated to return record instead.

### Features

- Add containers class getter to BaseContainer
- Add api uploadAsset to skygear database
- Move user related role api to AuthContainer
- New signup login, remove user object (#250)
- Accepting QueryResult as arguments at database.delete (#141)


### Bug Fixes

- Add back pubsub.reconfigure() (#260)
- Fix cloud container public and private db getter
- Fix exception on server fails to bind address and return meaningful message
- Handle null and undefined on SkygearResponse.isInstance checking
- Fix response header not wrapped in array
- Sign FS Asset URL correctly (SkygearIO/skygear-server#427)

### Other Notes

- Inject version string to skygear container with preprocess
- Update esdoc plugin to esdoc 1.0.1 syntax (#276)
- Upload doc prefixed with version to s3 bucket for CI
- Update API reference (SkygearIO/features#54)
- Remove the unused param actor in relation query api
- Update the description on HTTP_ADDR settings

## 1.0.0 (2017-06-30)

### Incompatible Changes

- Update container API grouping (#231, SkygearIO/features#70)

### Features

- Add forgot password functions to skygear.auth (#237, SkygearIO/features#70)

### Bug Fixes

- Fix unable to get/set ACL for new record (#203)
- Fixing issue with undefined this when saving asset #225
- Fix asset collector does not exit

### Other Notes

- Inject non-core function to core class in esdoc
- Fix various issues with lerna, gulp and lint

## 0.24.1 (2017-05-23)

### Incompatible Changes

Separate react-native related logic from main code (#160)

Skygear has special integration with React Native to leverage the
extended capability of the platform. Instead of just importing the normal
skygear, you should do this

```js
import skygear from 'skygear/react-native'
```

### Features

- Using lerna to make repo ready for multiple-packages (#192)
- Support plugin only request during plugin initialization (#189)
- Make S3 signer respect url prefix (#214)
- Read `.env` as in skygear-server (#179)
- Allow config of pg pool size (#201)
- Separate react-native related logic from main code

### Bug Fixes

- Fix unable to use SkygearResponse returned from handler

### Other Notes

- Fix formating for lint
- Query doc updated
- Refactor the usage of closure and promise
- Upgrade to loadash v4
- Add trailing slash to end-point if missing

## 0.23.0 (2017-04-20)

### Features
- Add pubsub.once helper function
- Accept arguments to create profile when creating user
  (SkygearIO/skygear-server#54)
- Move default ACL to server side (SkygearIO/skygear-server#309)
- Add an function to return user-readable error message

### Bug Fixes
- Fix unable to parse boolean value from envvar (#194)
- Fix shared user between containers (#186)
- Fix auth provider not binding when calling `handleAction`

### Other Notes
- Fix esdoc generation


## 0.22.2 (2017-03-31)

### Features
- Add url signing function to cloud (#165)

### Bug Fixes
- Fix request object's action only replace first `:` to `/`
- Put content type from server to asset objec

### Other Notes
- Add documentation on container pubsub on/off (#177)


## 0.22.1 (2017-02-15)

### Bug Fixes

- Fix timeout to container request (SkygearIO/skygear-server#271)

### Other Notes

- Update superagent version to ^3.4 (#166)

## 0.22.0 (2017-02-10)

### Features

- Add timeout to container request (SkygearIO/skygear-server#271)

### Other Notes

- Auto deploy to CDN and update esdoc.org (#147)

## 0.21.0 (2017-01-11)

### Features

- Call includeme in index.js for user cloud code
- Add support for LOAD_MODULES and includeme (#155)
- Accept bundle name when register device (SkygearIO/skygear-server#239)

### Bug Fixes

- Fix unable to start when LOAD_MODULES is not set

    This happens because when LOAD_MODULES is not set the parsed module
    list will be an array with an empty string. This causes configModule
    to be called with an empty string.


## 0.20.0 (2016-12-20)

### Features

- Set request context when calling cloud code (#143)
- Support unregister device (SkygearIO/skygear-server#245, SkygearIO/skygear-server#249)
- Support union database for cloud code development
- Export SkygearRequest and SkygearResponse
- Add poolConnect to select the app's database schema
- Implement server unknown type (SkygearIO/skygear-server#231)
- Make the cache become LRU cache (#130, #128)

### Bug Fixes

- Fix binary static asset encoding

    The existing implementation cannot send binary static asset through
    a handler. The new static asset handler returns a buffer so that
    that the transport layer uses the buffer's base64 encoding to fix this problem.

- Fix not able to create Record with `id` attr

    The constructor of Record prefers `id` to pass record ID, but it is not
    possible to use this attr as the update function will set the record ID
    to `id` property, which is readonly.

    Not having this change will result in TypeError:

    ```
    TypeError: Cannot set property id of #<Record> which has only a getter
    ```

### Other Notes

-  Fix nodedev Dockerfile working directory


## 0.19.2 (2016-11-19)

### Features

- Exposing skygear error codes (#51)
- Allow opt-out cache (#76)
- cloud: Support static asset
- Expose pg pool, settings and CloudCodeContainer

### Bug Fixes

- cloud: Return error to skygear-server in correct format (#127)
- cloud: Fix undefined result with no event handlers
- cloud: Fix base64 encoding error with utf-16 characters (#126)

### Other Notes

- Remove dep on localforage (#39)
- cloud: Update Dockerfile to add NODE_PATH


## 0.19.1 (2016-11-12)

### Features

- Support returning Promise in Cloud Function (#121)

### Bug Fixes

- Handle empty queryString in SkygearRequest


## 0.19.0 (2016-11-10)

## Features

- Add support for JS cloud code
- Accept same type of record instance in Record constructor (#73)

## Other Notes

- Change ourd to skygear


## 0.18.0 (2016-10-28)

### Features

- Add getUsersByUsername to container

### Bug Fixes

- Remove relation success return array of ids (#80)
- Fix change password not handling auth response (#90, #91)

### Other Notes

- Remove unused comment in Record
- Update to babel 6 and support node6 (#69)


## 0.17.0 (2016-09-15)

### Features

- Support last login and last seen at user object (SkygearIO/skygear-server#110)
- Allow sign up anonymously (#61)
- Update username of a user in saveUser (#83)

### Bug Fixes

- Fix crash on IE 10 when using `Array.from` (#66)


## 0.16.0 (2016-09-02)

### Features

- Support new asset upload mechanism (SkygearIO/skygear-server#107)
- Add `whoami` API for querying and update currentUser from server (SkygearIO/skygear-server#111)

### Bug Fixes

- `skygear.saveUser` do not clear roles by default (#56)
- Enable to handle relative asset POST path

### Other Notes

- Add github issue template


## 0.15.0 (2016-08-17)

### Features

- Support `page` property on query (#45)
- Add getRecordByID method to database object (#22)
- Support user discovery with username (SkygearIO/skygear-server#90, SkygearIO/skygear-SDK-JS#32)

### Other Notes

- Fix error code list to match server side (#49)
- Add auto deploy example to https://sdkjsexample.skygeario.com/static/example/index.html (#15)
- Make the asset toJSON and fromJSON mirror on $url key (#10)


## 0.14.0 (2016-07-26)

### Features

- Enable updating current user (#34)
- Make skygear easier to include in a webpack project
- Enable skygear to run in node by using memory localstorage
- Support Batch Atomic saving (#29)
- Reject with error message on trying to save undefined (#19)

### Bug fixes

- Add exception for invalid pubsub data (#27)

### Other Notes

- Remove unused count variable in RelationResult


## 0.13.0 (2016-07-05)

### Features

- Build minified js file (#16)

### Bug fixes

- Fix geolocations.js validation on longtude (#23)

### Other notes

- Add deploy command to deploy skygear.min.js to CDN (#21)


## 0.12.0 (2016-05-30)

### Features

- Expose more meta attrs in record
- Implement user based ACL
- Fallback to cookie storage on localStorage unavailable to support Safari
  private mode (#12)


## 0.11.0 (2016-05-09)

### Incompatible Changes
- Return Reference type from Record field (#1)

  This is a breaking change. Before this fix, the Record returns a plain
  JSON object for reference field. Therefore the way to get the ID of
  the referenced Record is changed.

### Other Notes
- Add test cases for serialize / deserialize date (#7)
- Update slack notification token (SkygearIO/skygear-server#19)


## 0.10.1 (2016-04-20)

### Bug fixes
- fix asset upload batch save


## 0.10.0 (2016-04-14)

### Incompatible Changes
- Correct the representation of public access and read/write level (oursky/skygear-SDK-JS#156)

  The correct representation of public access serve want is:
  `{ "level": "read", "public": true }`

  The previous `addWriteAccess` interface imply write and read is separate access
  entity. Which a record can be write, not not read (Something like Dropbox).
  This is misleading and not align with our implementation. So we change the API
  to `setReadWriteAccess` and `setReadOnlyAcces` to clear the ambiguity.

- Expose Query as constructor

  `skygear.Query` returns the query constructor.

  To create a query, use `new skygear.Query(Note)`, instead of
  `skygear.Query(Note)`

### Bug fixes
- Clear currentUser after logout (oursky/skygear-SDK-JS#162)
- support auth provider signup and login (oursky/skygear-SDK-JS#155)


## 0.9.0 (2016-03-16)

### Feature

- Add NOT operation and deserializer for query #148
- Implement batch save / delete records #153


## 0.8.0 (2016-03-09)

### Other Notes

- Update endpoint and payload for set record creationg access


## 0.7.0 (2016-03-02)

No change since last release


## 0.6.0 (2016-02-24)

### Features

- Add sample code for Role and ACL #143 #144
- Add ACL Class and ACL controls for Record #14 #36 #37 #38 #39
- Add Role Class and ACL Class #35 #38

### Bug Fixes

- Fix unable to reset cache when log out
- Fix unable to logout user in React Native


## 0.5.0 (2016-02-17)

### Bug Fixes

- Reconfigure pubsub after login #135
- Don't call cached query if remote query returned first #133


## 0.4.0 (2016-01-13)

### Features

- Allow client to listen to pubsub open/close events. #132


## 0.3.0 (2016-01-06)

### Features

- Automatically logout user when access token is not accepted #129

### Bug Fixes

- Prevent uploaded asset from being uploaded again #109
- Fix not able to register device if the existing device ID is not found #125


## 0.2.0 (2015-12-23)

### Bug Fixes

- Check if file exists before uploading asset oursky/skygear#454
- Fix error when AsyncStorage not available in web browser
- Use console.log instead of console.debug for React Native
- Fix bug on platform detection in react-native for iOS
- Use the pass in value to resolve the store promise in container
- Fix store not usable in react-native


## 0.1.0 (2015-12-16)

### Features

- Support cached query
- Support Auto-Increment ID

### Bug Fixes

- Fix React Native local storage bugs
- Fix upload filw with `+`
- Fix bug on platform detection at react native iOS
